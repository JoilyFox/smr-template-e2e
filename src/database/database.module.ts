import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Connection-only database module: provides and exports {@link PrismaService} so any feature module
 * can inject it. The demo CRUD lives in the optional ExamplesModule (`--with-examples`).
 */
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
