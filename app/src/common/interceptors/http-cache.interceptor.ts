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
import { mergeMap, Observable, of, tap } from 'rxjs';

/**
 * Read-through Redis cache for user-agnostic controllers.
 * - GET: cached by URL (path + query), marked `X-Cache: HIT|MISS`, expires after CACHE_TTL_MS.
 * - Any other method: after the handler succeeds, the whole cache namespace is cleared.
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

    if (req.method !== 'GET') {
      // ponytail: coarse invalidation (clears every cached page); use tagged/versioned keys if write volume grows.
      return next.handle().pipe(
        mergeMap(async (body: unknown) => {
          await this.cache.clear();
          return body;
        }),
      );
    }

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
