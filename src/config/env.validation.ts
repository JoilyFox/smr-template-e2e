import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  validateSync,
} from 'class-validator';

/** Supported runtime environments. */
export enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

/**
 * Base environment contract — only the variables the base app relies on.
 *
 * Validation is intentionally NON-STRICT: feature blocks (database, cache, auth) append their own
 * variables (e.g. MONGO_URI, REDIS_URL) to `.env`. Unknown keys are preserved and validated by the
 * block that consumes them; only the base keys below are asserted here.
 */
export class BaseEnv {
  @IsOptional()
  @IsEnum(NodeEnv)
  NODE_ENV?: NodeEnv;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT?: number;

  @IsOptional()
  @IsString()
  APP_NAME?: string;

  @IsOptional()
  @IsString()
  LOG_LEVEL?: string;

  @IsOptional()
  @IsString()
  CORS_ORIGIN?: string;
}

/**
 * `ConfigModule.forRoot({ validate })` hook. Fails fast at boot on an invalid base configuration,
 * and returns the original config untouched so block-provided variables are kept.
 */
export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const parsed = plainToInstance(BaseEnv, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(parsed, {
    skipMissingProperties: true,
    forbidUnknownValues: false,
  });

  if (errors.length > 0) {
    const details = errors
      .map((e) => Object.values(e.constraints ?? {}).join(', '))
      .join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  return config;
}
