import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth.module';
import { GoogleAuthController } from './google.controller';
import { GoogleAuthGuard } from './google-auth.guard';
import { GoogleStrategy } from './google.strategy';

/**
 * Google OAuth strategy add-on. Registers the `google` passport strategy and the redirect/callback
 * routes. Imports the shared `AuthModule` so the callback can issue the same app JWT pair as
 * password login via `AuthService.loginWithProfile`.
 */
@Module({
  imports: [AuthModule],
  controllers: [GoogleAuthController],
  providers: [GoogleStrategy, GoogleAuthGuard],
})
export class GoogleAuthModule {}
