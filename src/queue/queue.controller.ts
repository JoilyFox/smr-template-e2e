import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { QueueService } from './queue.service';

@ApiTags('queue')
@Controller('queue')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  /** Enqueue a demo job; the DemoProcessor handles it asynchronously. */
  @Post('jobs')
  enqueue(
    @Body() body: Record<string, unknown>,
  ): Promise<{ id: string | undefined }> {
    return this.queueService.enqueue(body);
  }
}
