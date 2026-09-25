import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Role } from '../generated/prisma/enums';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  const jwt = new JwtService({ secret: 'test-secret' });
  const reflector = new Reflector();
  const guard = new JwtAuthGuard(jwt, reflector);

  const run = (isPublic: boolean, authorization?: string) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(isPublic);
    const req: { headers: object; user?: unknown } = {
      headers: { authorization },
    };
    const ctx = {
      getHandler: () => null,
      getClass: () => null,
      switchToHttp: () => ({ getRequest: () => req }),
    } as unknown as ExecutionContext;
    return { req, result: guard.canActivate(ctx) };
  };

  it('attaches the user for a valid token', async () => {
    const token = await jwt.signAsync({
      sub: 'u1',
      email: 'a@b.c',
      role: Role.USER,
    });
    const { req, result } = run(false, `Bearer ${token}`);
    await expect(result).resolves.toBe(true);
    expect(req.user).toEqual({ id: 'u1', email: 'a@b.c', role: Role.USER });
  });

  it('rejects a protected route without a token', async () => {
    await expect(run(false).result).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a protected route with an invalid token', async () => {
    await expect(run(false, 'Bearer garbage').result).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('lets public routes through even with an invalid token', async () => {
    const { req, result } = run(true, 'Bearer garbage');
    await expect(result).resolves.toBe(true);
    expect(req.user).toBeUndefined();
  });
});
