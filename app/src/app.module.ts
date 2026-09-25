import { createKeyv } from '@keyv/redis';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { CacheModule } from '@nestjs/cache-manager';
import {
  MiddlewareConsumer,
  Module,
  NestModule,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { UserThrottlerGuard } from './common/guards/user-throttler.guard';
import { RequestLoggerMiddleware } from './common/request-logger.middleware';
import { validateEnv } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { AlbumsModule } from './albums/albums.module';
import { ArtistsModule } from './artists/artists.module';
import { TracksModule } from './tracks/tracks.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
      validate: validateEnv,
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ttl: config.getOrThrow<number>('CACHE_TTL_MS'),
        // namespace → cache.clear() only wipes cache keys, not throttler keys.
        stores: [
          createKeyv(config.getOrThrow<string>('REDIS_URL'), {
            namespace: 'cache',
          }),
        ],
      }),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: config.getOrThrow<number>('THROTTLE_TTL_MS'),
            limit: config.getOrThrow<number>('THROTTLE_LIMIT'),
          },
        ],
        // Redis storage → limits are shared across app instances.
        storage: new ThrottlerStorageRedisService(
          config.getOrThrow<string>('REDIS_URL'),
        ),
      }),
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ArtistsModule,
    AlbumsModule,
    TracksModule,
    HealthModule,
  ],
  providers: [
    // Global guards run in this order: authenticate → rate-limit (per user) → authorize.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: UserThrottlerGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    },
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
