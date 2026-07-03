import { Module } from '@nestjs/common';
import { ExampleModule } from './example/example.module';

/**
 * Aggregator for YOUR feature modules.
 *
 * `app.module.ts` imports this once, so you register every new feature here instead of touching the
 * root module. Add your feature module to the `imports` array:
 *
 *   imports: [ExampleModule, RoomsModule, BookingsModule],
 *
 * This file is YOUR code — unlike `generated.module.ts`, the generator never overwrites it.
 */
@Module({
  imports: [ExampleModule],
})
export class ModulesModule {}
