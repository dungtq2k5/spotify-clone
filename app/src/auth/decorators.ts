import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../generated/prisma/enums';
import { AuthUser } from './auth-user';

export const IS_PUBLIC_KEY = 'isPublic';

/** Skip authentication for a route/controller (a valid token is still attached if sent). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Restrict a route/controller to the given roles. Enforced by RolesGuard. */
export const Roles = Reflector.createDecorator<Role[]>();

/** Inject the authenticated user (or one of its fields) into a handler param. */
export const CurrentUser = createParamDecorator(
  (field: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const user = ctx.switchToHttp().getRequest<{ user?: AuthUser }>().user;
    return field ? user?.[field] : user;
  },
);
