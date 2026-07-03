import { Global, Module } from '@nestjs/common';
import { LoggerService } from './logger.service';

/** Global logging module so any provider can inject {@link LoggerService}. */
@Global()
@Module({
  providers: [LoggerService],
  exports: [LoggerService],
})
export class LoggerModule {}
