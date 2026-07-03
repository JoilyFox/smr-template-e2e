import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { UsersService } from './users.service';

/**
 * bcrypt work factor. 12 rounds is a sensible production default — strong against brute force while
 * keeping login latency low. Raise it as hardware improves.
 */
const SALT_ROUNDS = 12;

/**
 * Read a required signing secret from config, failing fast if it is missing or trivially weak.
 * A short or absent secret makes issued JWTs forgeable, so we refuse to boot rather than fall back
 * to an insecure hardcoded default.
 */
function requireStrongSecret(
  configService: ConfigService,
  key: string,
): string {
  const secret = configService.get<string>(key);
  if (!secret || secret.length < 16) {
    throw new Error(
      `${key} must be set to a strong value of at least 16 characters. ` +
        'Set it in the environment before starting the app.',
    );
  }
  return secret;
}

@Injectable()
export class AuthService {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    // Resolve the signing secrets once, at construction, and fail fast if either is missing or weak.
    this.accessTokenSecret = requireStrongSecret(configService, 'JWT_SECRET');
    this.refreshTokenSecret = requireStrongSecret(
      configService,
      'JWT_REFRESH_SECRET',
    );
  }

  async register(email: string, password: string) {
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw new BadRequestException('User with this email already exists');
    }
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await this.usersService.create(email, passwordHash);
    return this.generateTokenPair(user.id, user.email);
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.generateTokenPair(user.id, user.email);
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.refreshTokenSecret,
      });

      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return this.generateTokenPair(user.id, user.email);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Issue an app token pair for an externally-authenticated identity (e.g. a Google profile),
   * provisioning a local user on first sight. This is the bridge that lets OAuth strategies hand
   * back the same JWTs as password login, so every strategy shares one token format.
   */
  async loginWithProfile(email: string) {
    let user = await this.usersService.findByEmail(email);
    if (!user) {
      // OAuth users authenticate through the provider, never a password. Store a bcrypt hash of a
      // random secret so `bcrypt.compare` can never succeed against a user-supplied password — the
      // account is unusable for password login by construction.
      const unusablePassword = randomBytes(32).toString('hex');
      const passwordHash = await bcrypt.hash(unusablePassword, SALT_ROUNDS);
      user = await this.usersService.create(email, passwordHash);
    }
    return this.generateTokenPair(user.id, user.email);
  }

  private async generateTokenPair(userId: string, email: string) {
    const payload = { sub: userId, email };

    const accessTokenExpires =
      this.configService.get<string>('JWT_EXPIRES_IN') || '3600s';
    const refreshTokenExpires =
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';

    // `expiresIn` comes from config as a string (e.g. "3600s", "7d"); @nestjs/jwt v11 types it as the
    // narrower `number | ms.StringValue`, so assert to the option's type.
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.accessTokenSecret,
        expiresIn: accessTokenExpires as JwtSignOptions['expiresIn'],
      }),
      this.jwtService.signAsync(payload, {
        secret: this.refreshTokenSecret,
        expiresIn: refreshTokenExpires as JwtSignOptions['expiresIn'],
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }
}
