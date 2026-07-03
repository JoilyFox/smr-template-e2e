import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { KAFKA_CLIENT, parseBrokers } from './kafka.constants';
import { KafkaMessagingService } from './kafka.service';
import { KafkaMessagingController } from './kafka.controller';

/**
 * Kafka messaging. Registers a client for publishing events; the consumer side runs as a
 * microservice connected in main.ts via `connectKafkaMessaging` (see kafka.bootstrap.ts).
 *
 * Namespaced so it can coexist with other transports (e.g. RabbitMQ) in the same app.
 */
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: KAFKA_CLIENT,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: config.get<string>('KAFKA_CLIENT_ID') ?? 'app',
              brokers: parseBrokers(config.get<string>('KAFKA_BROKERS')),
            },
            consumer: {
              groupId: config.get<string>('KAFKA_GROUP_ID') ?? 'app-consumer',
            },
          },
        }),
      },
    ]),
  ],
  controllers: [KafkaMessagingController],
  providers: [KafkaMessagingService],
})
export class KafkaMessagingModule {}
