import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { RABBITMQ_CLIENT } from './rabbitmq.constants';

/** Publishes events to RabbitMQ. Inject wherever you need to emit messages. */
@Injectable()
export class RabbitMessagingService {
  constructor(@Inject(RABBITMQ_CLIENT) private readonly client: ClientProxy) {}

  publish(pattern: string, data: Record<string, unknown>): void {
    this.client.emit(pattern, data);
  }
}
