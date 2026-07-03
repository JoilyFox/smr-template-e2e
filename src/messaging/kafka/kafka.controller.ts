import { Body, Controller, Logger, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EventPattern, Payload } from '@nestjs/microservices';
import { KafkaMessagingService } from './kafka.service';
import { KAFKA_APP_EVENT } from './kafka.constants';

@ApiTags('messaging:kafka')
@Controller('messaging/kafka')
export class KafkaMessagingController {
  private readonly logger = new Logger(KafkaMessagingController.name);

  constructor(private readonly messaging: KafkaMessagingService) {}

  /** Publish a demo event to Kafka. */
  @Post('publish')
  publish(@Body() body: { pattern?: string; data?: Record<string, unknown> }): {
    published: boolean;
    pattern: string;
  } {
    const pattern = body.pattern ?? KAFKA_APP_EVENT;
    this.messaging.publish(pattern, body.data ?? {});
    return { published: true, pattern };
  }

  /** Consume the demo event topic (runs in the microservice connected from main.ts). */
  @EventPattern(KAFKA_APP_EVENT)
  handleEvent(@Payload() data: Record<string, unknown>): void {
    this.logger.log(`Received ${KAFKA_APP_EVENT}: ${JSON.stringify(data)}`);
  }
}
