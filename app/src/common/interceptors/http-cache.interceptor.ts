import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Cache } from 'cache-manager';
import type { Request, Response } from 'express';
import { Observable, of, tap } from 'rxjs';

/**
 * Caches GET responses in Redis keyed by URL (path + query) and marks them
 * with `X-Cache: HIT|MISS`. Only for user-agnostic endpoints.
 * Invalidation: catalog writes call `cache.clear()`.
 */
@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  async intercept(
    ctx: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const req = ctx.switchToHttp().getRequest<Request>();
    const res = ctx.switchToHttp().getResponse<Response>();
    if (req.method !== 'GET') return next.handle();

    const key = `http:${req.originalUrl}`;
    const hit = await this.cache.get(key);
    if (hit != null) {
      res.setHeader('X-Cache', 'HIT');
      return of(hit);
    }
    res.setHeader('X-Cache', 'MISS');
    return next.handle().pipe(tap((body) => void this.cache.set(key, body)));
  }
}
