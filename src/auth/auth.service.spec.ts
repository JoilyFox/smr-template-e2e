import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersService } from './users.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;

  const mockJwtService = {
    signAsync: jest.fn().mockResolvedValue('mock-token'),
    verifyAsync: jest
      .fn()
      .mockResolvedValue({ sub: 'mock-user-id', email: 'test@example.com' }),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      // Secrets must be >= 16 chars or AuthService refuses to construct (fail-fast on weak secrets).
      if (key === 'JWT_SECRET') return 'test-secret-0123456789';
      if (key === 'JWT_REFRESH_SECRET') return 'test-refresh-secret-0123456789';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        UsersService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user and return tokens', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const result = await service.register(email, password);

      expect(result).toEqual({
        accessToken: 'mock-token',
        refreshToken: 'mock-token',
      });
      expect(mockJwtService.signAsync).toHaveBeenCalled();
    });

    it('should throw BadRequestException for duplicate email', async () => {
      const email = 'dup@example.com';
      const password = 'password123';
      await service.register(email, password);

      await expect(service.register(email, password)).rejects.toThrow();
    });
  });

  describe('login', () => {
    it('should log in a user with valid credentials', async () => {
      const email = 'login@example.com';
      const password = 'password123';
      await service.register(email, password);

      const result = await service.login(email, password);
      expect(result).toEqual({
        accessToken: 'mock-token',
        refreshToken: 'mock-token',
      });
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      const email = 'login2@example.com';
      const password = 'password123';
      await service.register(email, password);

      await expect(service.login(email, 'wrongpassword')).rejects.toThrow();
    });

    it('should throw UnauthorizedException if user not found', async () => {
      await expect(
        service.login('notfound@example.com', 'password'),
      ).rejects.toThrow();
    });
  });

  describe('loginWithProfile', () => {
    it('provisions a user on first sight and returns tokens', async () => {
      const result = await service.loginWithProfile('oauth-user@example.com');
      expect(result).toEqual({
        accessToken: 'mock-token',
        refreshToken: 'mock-token',
      });
      expect(
        await usersService.findByEmail('oauth-user@example.com'),
      ).not.toBeNull();
    });

    it('reuses an existing user on subsequent logins', async () => {
      await service.loginWithProfile('repeat@example.com');
      const first = await usersService.findByEmail('repeat@example.com');
      await service.loginWithProfile('repeat@example.com');
      const second = await usersService.findByEmail('repeat@example.com');
      expect(second!.id).toBe(first!.id);
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens given a valid refresh token', async () => {
      const email = 'refresh@example.com';
      const password = 'password123';
      await service.register(email, password);

      // Retrieve the user to verify its ID
      const user = await usersService.findByEmail(email);
      mockJwtService.verifyAsync.mockResolvedValueOnce({
        sub: user!.id,
        email,
      });

      const result = await service.refreshTokens('some-refresh-token');
      expect(result).toEqual({
        accessToken: 'mock-token',
        refreshToken: 'mock-token',
      });
    });

    it('should throw UnauthorizedException if token verification fails', async () => {
      mockJwtService.verifyAsync.mockRejectedValueOnce(
        new Error('verification failed'),
      );
      await expect(
        service.refreshTokens('invalid-refresh-token'),
      ).rejects.toThrow();
    });
  });
});
