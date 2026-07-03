import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import pino, { Logger } from 'pino';

/**
 * Pino-backed implementation of the app logger (this block overwrites the base ConsoleLogger
 * version). Keeps the same class name and DI token, so `app.useLogger(app.get(LoggerService))`
 * in main.ts and the global LoggerModule keep working unchanged.
 *
 * Structured JSON in production; pretty-printed in development via pino-pretty.
 */
@Injectable()
export class LoggerService implements NestLoggerService {
  private readonly logger: Logger;

  constructor() {
    const isProd = process.env.NODE_ENV === 'production';
    this.logger = pino({
      level: process.env.LOG_LEVEL ?? 'info',
      transport: isProd
        ? undefined
        : { target: 'pino-pretty', options: { singleLine: true } },
    });
  }

  log(message: unknown, context?: string): void {
    this.logger.info({ context }, String(message));
  }

  error(message: unknown, trace?: string, context?: string): void {
    this.logger.error({ context, trace }, String(message));
  }

  warn(message: unknown, context?: string): void {
    this.logger.warn({ context }, String(message));
  }

  debug(message: unknown, context?: string): void {
    this.logger.debug({ context }, String(message));
  }

  verbose(message: unknown, context?: string): void {
    this.logger.trace({ context }, String(message));
  }
}
