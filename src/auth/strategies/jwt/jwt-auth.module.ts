import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth.module';
import { JwtAuthController } from './jwt.controller';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtStrategy } from './jwt.strategy';

/**
 * JWT bearer strategy add-on. Registers the `jwt` passport strategy (validating bearer tokens
 * against the core users store) and exposes the protected `GET /auth/me`. Imports the shared
 * `AuthModule` for `UsersService` + passport plumbing. Exports `JwtAuthGuard` so other modules can
 * protect their own routes with bearer auth.
 */
@Module({
  imports: [AuthModule],
  controllers: [JwtAuthController],
  providers: [JwtStrategy, JwtAuthGuard],
  exports: [JwtAuthGuard],
})
export class JwtAuthModule {}
