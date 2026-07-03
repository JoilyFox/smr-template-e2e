import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { trace } from '@opentelemetry/api';
import { PrismaService } from '../../database/prisma.service';
import { CacheService } from '../../cache/cache.service';
import { QueueService } from '../../queue/queue.service';
import { RabbitMessagingService } from '../../messaging/rabbitmq/rabbitmq.service';
import { RABBITMQ_APP_EVENT } from '../../messaging/rabbitmq/rabbitmq.constants';
import { KafkaMessagingService } from '../../messaging/kafka/kafka.service';
import { KAFKA_APP_EVENT } from '../../messaging/kafka/kafka.constants';
import { CreateOrderDto } from './dto/create-order.dto';

const CACHE_TTL_SECONDS = 60;
const cacheKey = (id: string) => `orders:${id}`;

/**
 * Orders feature — a single flow that exercises every backend module the template wires:
 * Postgres (Prisma), Redis (cache-aside), BullMQ (background job), RabbitMQ + Kafka (events),
 * OpenTelemetry (a custom span) and structured logging.
 */
@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  private readonly tracer = trace.getTracer('orders');

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly queue: QueueService,
    private readonly rabbit: RabbitMessagingService,
    private readonly kafka: KafkaMessagingService,
  ) {}

  /** Create an order and fan the side effects out across queue + both messaging transports. */
  async create(dto: CreateOrderDto, createdBy: string) {
    // A custom span shows up in the OTel traces alongside the auto-instrumented HTTP/DB spans.
    return this.tracer.startActiveSpan('orders.create', async (span) => {
      try {
        const order = await this.prisma.order.create({ data: { ...dto } });
        span.setAttribute('order.id', order.id);
        span.setAttribute('order.amount', order.amount);

        // Background work (BullMQ → Redis) — e.g. fulfilment, invoicing.
        const job = await this.queue.enqueue({
          type: 'process-order',
          orderId: order.id,
        });

        // Domain event to both transports so downstream consumers (or other services) can react.
        const event = {
          orderId: order.id,
          item: order.item,
          amount: order.amount,
          createdBy,
        };
        this.rabbit.publish(RABBITMQ_APP_EVENT, event);
        this.kafka.publish(KAFKA_APP_EVENT, event);

        // Warm the cache so an immediate read is a hit.
        await this.cache.set(
          cacheKey(order.id),
          JSON.stringify(order),
          CACHE_TTL_SECONDS,
        );

        this.logger.log(
          `Order ${order.id} created by ${createdBy} (job ${job.id}); events published to rabbitmq + kafka`,
        );
        return order;
      } finally {
        span.end();
      }
    });
  }

  async findAll() {
    return this.prisma.order.findMany({ orderBy: { createdAt: 'desc' } });
  }

  /** Cache-aside read: serve from Redis on a hit, fall back to Postgres and populate the cache. */
  async findOne(id: string) {
    const key = cacheKey(id);
    const cached = await this.cache.get(key);
    if (cached) {
      this.logger.log(`Cache HIT for order ${id}`);
      return { ...JSON.parse(cached), _source: 'cache' };
    }

    this.logger.log(`Cache MISS for order ${id} — reading from Postgres`);
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException(`Order ${id} not found`);
    }
    await this.cache.set(key, JSON.stringify(order), CACHE_TTL_SECONDS);
    return { ...order, _source: 'db' };
  }
}
