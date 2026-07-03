import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { CacheModule } from '../../cache/cache.module';
import { QueueModule } from '../../queue/queue.module';
import { RabbitMessagingModule } from '../../messaging/rabbitmq/rabbitmq.module';
import { KafkaMessagingModule } from '../../messaging/kafka/kafka.module';
import { JwtAuthModule } from '../../auth/strategies/jwt/jwt-auth.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

/**
 * Orders feature module. Pulls in every block it needs — database, cache, queue, both messaging
 * transports and JWT auth — via their exported providers, then bundles the orders controller/service.
 */
@Module({
  imports: [
    DatabaseModule,
    CacheModule,
    QueueModule,
    RabbitMessagingModule,
    KafkaMessagingModule,
    JwtAuthModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
