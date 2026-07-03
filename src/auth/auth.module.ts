import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersService } from './users.service';

/**
 * Shared auth core. Owns the token issuing/refresh endpoints, the in-memory users store, and the
 * passport/JWT plumbing that every auth strategy reuses. Strategy blocks (jwt, google) import this
 * module to pick up `AuthService` / `UsersService` and contribute their own passport strategy.
 */
@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, UsersService],
  exports: [AuthService, UsersService, PassportModule, JwtModule],
})
export class AuthModule {}
