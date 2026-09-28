import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

/**
 * Assigns `X-Request-Id` and logs one structured line per request.
 * Middleware (not an interceptor) on purpose: it runs before guards, so
 * 401/403/429 rejections are logged too, and `finish` sees the final status.
 */
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const requestId = req.header('x-request-id') ?? randomUUID();
    const start = performance.now();
    res.setHeader('X-Request-Id', requestId);
    res.on('finish', () => {
      this.logger.log({
        requestId,
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        ms: Math.round(performance.now() - start),
        userId: (req as Request & { user?: { id: string } }).user?.id,
      });
    });
    next();
  }
}
