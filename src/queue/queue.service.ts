import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DEMO_QUEUE } from './queue.processor';

/** Producer for the demo queue. Inject this wherever you need to enqueue background work. */
@Injectable()
export class QueueService {
  constructor(@InjectQueue(DEMO_QUEUE) private readonly queue: Queue) {}

  async enqueue(
    data: Record<string, unknown>,
  ): Promise<{ id: string | undefined }> {
    const job = await this.queue.add('demo-job', data);
    return { id: job.id };
  }
}
