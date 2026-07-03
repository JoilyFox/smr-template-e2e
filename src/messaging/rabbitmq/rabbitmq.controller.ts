import { Body, Controller, Logger, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EventPattern, Payload } from '@nestjs/microservices';
import { RabbitMessagingService } from './rabbitmq.service';
import { RABBITMQ_APP_EVENT } from './rabbitmq.constants';

@ApiTags('messaging:rabbitmq')
@Controller('messaging/rabbitmq')
export class RabbitMessagingController {
  private readonly logger = new Logger(RabbitMessagingController.name);

  constructor(private readonly messaging: RabbitMessagingService) {}

  /** Publish a demo event to RabbitMQ. */
  @Post('publish')
  publish(@Body() body: { pattern?: string; data?: Record<string, unknown> }): {
    published: boolean;
    pattern: string;
  } {
    const pattern = body.pattern ?? RABBITMQ_APP_EVENT;
    this.messaging.publish(pattern, body.data ?? {});
    return { published: true, pattern };
  }

  /** Consume the demo event (runs in the microservice connected from main.ts). */
  @EventPattern(RABBITMQ_APP_EVENT)
  handleEvent(@Payload() data: Record<string, unknown>): void {
    this.logger.log(`Received ${RABBITMQ_APP_EVENT}: ${JSON.stringify(data)}`);
  }
}
