import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from '../../auth.service';
import { GoogleAuthGuard } from './google-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class GoogleAuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Initiate Google OAuth2 flow' })
  @ApiResponse({
    status: 302,
    description: 'Redirects to Google login consent screen.',
  })
  async googleAuth() {
    // Initiates Google authentication, handled by guard redirect.
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google OAuth2 callback' })
  @ApiResponse({
    status: 200,
    description: 'Issues an app JWT for the authenticated Google user.',
  })
  async googleAuthRedirect(@Req() req: any) {
    // The passport strategy puts the validated and mapped user on req.user. We hand back the same
    // JWT pair as password login, so a Google sign-in slots into the shared token flow.
    //
    // Only safe profile fields and the app's own JWTs leave the server. The Google `accessToken`
    // (and any `refreshToken`) the strategy attached to req.user is a credential for calling Google
    // APIs — it is deliberately NOT echoed back to the browser.
    const { googleId, email, firstName, lastName, picture } = req.user;
    const tokens = await this.authService.loginWithProfile(email);
    return {
      message: 'Google login successful',
      user: { googleId, email, firstName, lastName, picture },
      ...tokens,
    };
  }
}
