import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Kafka } from 'kafkajs';
import { KAFKA_APP_EVENT, parseBrokers } from './kafka.constants';

/**
 * Attach the Kafka consumer as a microservice. Called from the generated `applyBootstrap(app)` in
 * main.ts. This only *connects* the transport — the generated bootstrap calls
 * `app.startAllMicroservices()` once after all transports are connected (see manifest
 * `startsMicroservices`), so Kafka can run alongside other transports without double-starting.
 *
 * The demo topic is created up front so the consumer's first metadata fetch doesn't fail with
 * UNKNOWN_TOPIC_OR_PARTITION on a fresh broker.
 */
export async function connectKafkaMessaging(
  app: INestApplication,
): Promise<void> {
  const config = app.get(ConfigService);
  const brokers = parseBrokers(config.get<string>('KAFKA_BROKERS'));
  const clientId = config.get<string>('KAFKA_CLIENT_ID') ?? 'app';

  const admin = new Kafka({ clientId, brokers }).admin();
  try {
    await admin.connect();
    await admin.createTopics({
      topics: [{ topic: KAFKA_APP_EVENT }],
      waitForLeaders: true,
    });
  } catch {
    // Topic already exists, or the broker auto-creates it — safe to ignore.
  } finally {
    await admin.disconnect();
  }

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: { clientId, brokers },
      consumer: {
        groupId: config.get<string>('KAFKA_GROUP_ID') ?? 'app-consumer',
      },
    },
  });
}
