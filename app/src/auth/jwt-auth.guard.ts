import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { AuthUser, JwtPayload } from './auth-user';
import { IS_PUBLIC_KEY } from './decorators';

/**
 * Global authentication guard (registered as APP_GUARD).
 * Verifies the Bearer access token and sets `request.user`.
 * Routes marked @Public() pass without a token.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const [type, token] = req.headers.authorization?.split(' ') ?? [];

    if (type === 'Bearer' && token) {
      try {
        const p = await this.jwt.verifyAsync<JwtPayload>(token);
        req.user = { id: p.sub, email: p.email, role: p.role };
      } catch {
        if (!isPublic)
          throw new UnauthorizedException('Invalid or expired token');
      }
    }
    if (!isPublic && !req.user) throw new UnauthorizedException();
    return true;
  }
}
