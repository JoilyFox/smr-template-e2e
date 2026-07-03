import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => {
    return {
      get: jest.fn().mockResolvedValue('mock-value'),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      quit: jest.fn().mockResolvedValue('OK'),
    };
  });
});

describe('CacheService', () => {
  let service: CacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('redis://localhost:6379'),
          },
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
    service.onModuleInit();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should get a value', async () => {
    const value = await service.get('test-key');
    expect(value).toBe('mock-value');
  });

  it('should set a value without TTL', async () => {
    await expect(service.set('test-key', 'test-value')).resolves.not.toThrow();
  });

  it('should set a value with TTL', async () => {
    await expect(
      service.set('test-key', 'test-value', 60),
    ).resolves.not.toThrow();
  });

  it('should delete a value', async () => {
    await expect(service.del('test-key')).resolves.not.toThrow();
  });
});
