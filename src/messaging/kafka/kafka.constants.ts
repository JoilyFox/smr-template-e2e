/** DI token for the Kafka message-publishing client. */
export const KAFKA_CLIENT = 'KAFKA_CLIENT';

/** Default topic/pattern used by the demo producer/consumer. */
export const KAFKA_APP_EVENT = 'app.event';

/** Parse a comma-separated broker list from KAFKA_BROKERS. */
export function parseBrokers(value: string | undefined): string[] {
  return (value ?? 'localhost:9092')
    .split(',')
    .map((b) => b.trim())
    .filter(Boolean);
}
