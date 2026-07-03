import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RABBITMQ_CLIENT } from './rabbitmq.constants';
import { RabbitMessagingService } from './rabbitmq.service';
import { RabbitMessagingController } from './rabbitmq.controller';

/**
 * RabbitMQ messaging. Registers a client for publishing events; the consumer side runs as a
 * microservice connected in main.ts via `connectRabbitMessaging` (see rabbitmq.bootstrap.ts).
 *
 * Namespaced so it can coexist with other transports (e.g. Kafka) in the same app.
 */
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: RABBITMQ_CLIENT,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [
              config.get<string>('RABBITMQ_URL') ??
                'amqp://guest:guest@localhost:5672',
            ],
            queue: config.get<string>('RABBITMQ_QUEUE') ?? 'app_events',
            queueOptions: { durable: true },
          },
        }),
      },
    ]),
  ],
  controllers: [RabbitMessagingController],
  providers: [RabbitMessagingService],
})
export class RabbitMessagingModule {}
