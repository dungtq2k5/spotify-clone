import { CallHandler, ExecutionContext } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { lastValueFrom, of } from 'rxjs';
import { HttpCacheInterceptor } from './http-cache.interceptor';

describe('HttpCacheInterceptor', () => {
  const cache = {
    get: jest.fn(),
    set: jest.fn(),
    clear: jest.fn(),
  };
  const interceptor = new HttpCacheInterceptor(cache as unknown as Cache);
  const res = { setHeader: jest.fn() };
  const ctx = (method: string) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ method, originalUrl: '/api/tracks?page=1' }),
        getResponse: () => res,
      }),
    }) as unknown as ExecutionContext;
  const handler = (body: unknown) =>
    ({ handle: jest.fn(() => of(body)) }) as CallHandler & {
      handle: jest.Mock;
    };

  beforeEach(() => jest.clearAllMocks());

  it('serves a cached GET without calling the handler', async () => {
    cache.get.mockResolvedValue({ cached: true });
    const next = handler({ fresh: true });
    const out = await lastValueFrom(
      await interceptor.intercept(ctx('GET'), next),
    );
    expect(out).toEqual({ cached: true });
    expect(next.handle).not.toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith('X-Cache', 'HIT');
  });

  it('stores a GET miss under the URL key', async () => {
    cache.get.mockResolvedValue(undefined);
    const out = await lastValueFrom(
      await interceptor.intercept(ctx('GET'), handler({ fresh: true })),
    );
    expect(out).toEqual({ fresh: true });
    expect(cache.set).toHaveBeenCalledWith('http:/api/tracks?page=1', {
      fresh: true,
    });
    expect(res.setHeader).toHaveBeenCalledWith('X-Cache', 'MISS');
  });

  it('clears the cache after a successful write', async () => {
    const out = await lastValueFrom(
      await interceptor.intercept(ctx('POST'), handler({ id: 1 })),
    );
    expect(out).toEqual({ id: 1 });
    expect(cache.clear).toHaveBeenCalled();
    expect(cache.get).not.toHaveBeenCalled();
  });
});
