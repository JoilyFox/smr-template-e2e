import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

/** Name of the demo queue. Shared by the producer (QueueService) and this processor. */
export const DEMO_QUEUE = 'demo';

/**
 * Example background worker. Replace `process()` with real job handling, or remove this block's
 * demo files once you add your own queues.
 */
@Processor(DEMO_QUEUE)
export class DemoProcessor extends WorkerHost {
  private readonly logger = new Logger(DemoProcessor.name);

  async process(job: Job): Promise<unknown> {
    this.logger.log(`Processing job ${job.id} (${job.name})`);
    return { processedAt: new Date().toISOString(), data: job.data };
  }
}
