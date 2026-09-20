import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../generated/prisma/enums';
import { RolesGuard } from './roles.guard';

const ctxFor = (user?: { role: Role }) =>
  ({
    getHandler: () => null,
    getClass: () => null,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as unknown as ExecutionContext;

describe('RolesGuard', () => {
  const reflector = new Reflector();
  const guard = new RolesGuard(reflector);
  const requireRoles = (roles?: Role[]) =>
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(roles);

  it('allows routes without @Roles', () => {
    requireRoles(undefined);
    expect(guard.canActivate(ctxFor({ role: Role.USER }))).toBe(true);
  });

  it('allows a user with a required role', () => {
    requireRoles([Role.ADMIN]);
    expect(guard.canActivate(ctxFor({ role: Role.ADMIN }))).toBe(true);
  });

  it('rejects a user without the required role', () => {
    requireRoles([Role.ADMIN]);
    expect(() => guard.canActivate(ctxFor({ role: Role.USER }))).toThrow(
      ForbiddenException,
    );
  });

  it('rejects when there is no user', () => {
    requireRoles([Role.ADMIN]);
    expect(() => guard.canActivate(ctxFor())).toThrow(ForbiddenException);
  });
});
