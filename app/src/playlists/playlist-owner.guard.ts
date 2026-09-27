import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isUUID } from 'class-validator';
import type { Request } from 'express';
import { AuthUser } from '../auth/auth-user';
import { Role } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Resource-level authorization: only the playlist owner (or an admin) may
 * modify it. Guards are DI-aware, so the ownership lookup lives here instead
 * of being repeated as if/else in every handler.
 */
@Injectable()
export class PlaylistOwnerGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx
      .switchToHttp()
      .getRequest<Request<{ id: string }> & { user: AuthUser }>();
    const id = req.params.id;
    const playlist = isUUID(id)
      ? await this.prisma.playlist.findUnique({
          where: { id },
          select: { ownerId: true },
        })
      : null;
    if (!playlist) throw new NotFoundException('Playlist not found');
    if (playlist.ownerId !== req.user.id && req.user.role !== Role.ADMIN) {
      throw new ForbiddenException('Not the playlist owner');
    }
    return true;
  }
}
