import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { appConfig } from './config/app.config';
import { validateEnv } from './config/env.validation';
import { LoggerModule } from './common/logger/logger.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { GeneratedModule } from './generated.module';
import { HealthModule } from './health/health.module';
import { ModulesModule } from './modules/modules.module';

/**
 * Root module of the generated app.
 *
 * Feature blocks (database, cache, auth) are wired through GeneratedModule — a CLI-emitted
 * aggregator (src/generated.module.ts) that imports whichever block modules were selected. The base
 * ships an empty GeneratedModule so the app compiles standalone; the generator overwrites only that
 * one file. This module is therefore byte-identical in every generated app.
 * See docs/proposals/001-module-wiring.md.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validate: validateEnv,
    }),
    LoggerModule,
    GeneratedModule,
    HealthModule,
    ModulesModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
