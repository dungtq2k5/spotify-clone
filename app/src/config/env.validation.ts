import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsString,
  MinLength,
  validateSync,
} from 'class-validator';

enum NodeEnv {
  development = 'development',
  production = 'production',
  test = 'test',
}

/** Shape of process.env the app is allowed to boot with. Fails fast on startup. */
export class EnvironmentVariables {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.development;

  @IsInt()
  PORT: number = 3000;

  @IsString()
  DATABASE_URL: string;

  @IsString()
  REDIS_URL: string;

  @IsString()
  CORS_ORIGINS: string = '';

  @IsString()
  @MinLength(32)
  JWT_ACCESS_SECRET: string;

  @IsInt()
  JWT_ACCESS_TTL: number = 900;

  @IsInt()
  REFRESH_TOKEN_TTL_DAYS: number = 7;

  @IsInt()
  CACHE_TTL_MS: number = 30_000;

  @IsInt()
  THROTTLE_TTL_MS: number = 60_000;

  @IsInt()
  THROTTLE_LIMIT: number = 100;
}

export function validateEnv(config: Record<string, unknown>) {
  const env = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(env, { skipMissingProperties: false });
  if (errors.length) {
    throw new Error(`Invalid environment:\n${errors.toString()}`);
  }
  return env;
}
