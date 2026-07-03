import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { KAFKA_CLIENT } from './kafka.constants';

/** Publishes events to Kafka. Inject wherever you need to emit messages. */
@Injectable()
export class KafkaMessagingService {
  constructor(@Inject(KAFKA_CLIENT) private readonly client: ClientProxy) {}

  publish(pattern: string, data: Record<string, unknown>): void {
    this.client.emit(pattern, data);
  }
}
