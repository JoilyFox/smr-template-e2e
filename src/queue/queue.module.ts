import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { QueueService } from './queue.service';
import { QueueController } from './queue.controller';
import { DemoProcessor, DEMO_QUEUE } from './queue.processor';

/**
 * Wires BullMQ to the same Redis the cache block provides (this block `requires` cache:redis).
 * Connection is derived from REDIS_URL.
 */
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = new URL(
          config.get<string>('REDIS_URL') ?? 'redis://localhost:6379',
        );
        // Preserve credentials, DB index and TLS from REDIS_URL (matches how
        // the cache block consumes it) — otherwise auth/`rediss://` are dropped.
        const db = url.pathname.replace(/^\//, '');
        return {
          connection: {
            host: url.hostname,
            port: Number(url.port) || 6379,
            username: url.username || undefined,
            password: url.password || undefined,
            db: db ? Number(db) : undefined,
            ...(url.protocol === 'rediss:' ? { tls: {} } : {}),
          },
        };
      },
    }),
    BullModule.registerQueue({ name: DEMO_QUEUE }),
  ],
  controllers: [QueueController],
  providers: [QueueService, DemoProcessor],
  exports: [QueueService],
})
export class QueueModule {}
