import { Module } from '@nestjs/common';
import { DatabaseModule } from './database.module';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';

/**
 * Demo CRUD resource (sample `Item` over Prisma). Generated only with `--with-examples`; delete
 * it once you have your own resources. Pulls `PrismaService` from the connection-only
 * {@link DatabaseModule}.
 */
@Module({
  imports: [DatabaseModule],
  controllers: [ItemsController],
  providers: [ItemsService],
})
export class ExamplesModule {}
