import { Module } from '@nestjs/common';
import { ExampleController } from './example.controller';
import { ExampleService } from './example.service';

/**
 * Example feature module.
 *
 * A feature module bundles its controller(s) and provider(s) into one unit. This is what you
 * register in `ModulesModule` (../modules.module.ts). Copy this whole folder to start a new feature
 * — or run `nest g resource modules/<name>` — and delete `example/` once you no longer need the
 * reference.
 */
@Module({
  controllers: [ExampleController],
  providers: [ExampleService],
  exports: [ExampleService],
})
export class ExampleModule {}
