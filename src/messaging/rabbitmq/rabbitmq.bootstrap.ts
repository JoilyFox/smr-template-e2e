import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

/**
 * Attach the RabbitMQ consumer as a microservice. Called from the generated `applyBootstrap(app)`
 * in main.ts. This only *connects* the transport — the generated bootstrap calls
 * `app.startAllMicroservices()` once after all transports are connected (see manifest
 * `startsMicroservices`), so RabbitMQ can run alongside other transports without double-starting.
 */
export async function connectRabbitMessaging(
  app: INestApplication,
): Promise<void> {
  const config = app.get(ConfigService);
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [
        config.get<string>('RABBITMQ_URL') ??
          'amqp://guest:guest@localhost:5672',
      ],
      queue: config.get<string>('RABBITMQ_QUEUE') ?? 'app_events',
      queueOptions: { durable: true },
    },
  });
}
