import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicatorService,
} from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import type { Cache } from 'cache-manager';
import { Public } from '../auth/decorators';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('health')
@Public()
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly indicator: HealthIndicatorService,
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.ping('database', () => this.prisma.$queryRaw`SELECT 1`),
      () => this.ping('redis', () => this.cache.set('health:ping', 1, 1000)),
    ]);
  }

  private async ping<K extends string>(key: K, fn: () => Promise<unknown>) {
    const session = this.indicator.check(key);
    try {
      await fn();
      return session.up();
    } catch (e) {
      return session.down((e as Error).message);
    }
  }
}
