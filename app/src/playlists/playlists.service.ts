import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthUser } from '../auth/auth-user';
import {
  paginate,
  PaginationQueryDto,
  pageArgs,
} from '../common/dto/pagination.dto';
import { Prisma, Role } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { trackInclude } from '../tracks/tracks.service';
import { CreatePlaylistDto, UpdatePlaylistDto } from './playlists.dto';

const listInclude = {
  owner: { select: { id: true, displayName: true } },
  _count: { select: { tracks: true } },
} satisfies Prisma.PlaylistInclude;

@Injectable()
export class PlaylistsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Public playlists, or the caller's own when `ownerId` is given. */
  async findAll(query: PaginationQueryDto, ownerId?: string) {
    const where: Prisma.PlaylistWhereInput = {
      ...(ownerId ? { ownerId } : { isPublic: true }),
      name: query.q ? { contains: query.q, mode: 'insensitive' } : undefined,
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.playlist.findMany({
        where,
        include: listInclude,
        orderBy: { updatedAt: 'desc' },
        ...pageArgs(query),
      }),
      this.prisma.playlist.count({ where }),
    ]);
    return paginate(data, total, query);
  }

  /** Private playlists 404 for anyone but the owner/admin (don't leak existence). */
  async findOne(id: string, user?: AuthUser) {
    const playlist = await this.withTracks(id);
    const canSee =
      playlist?.isPublic ||
      playlist?.ownerId === user?.id ||
      user?.role === Role.ADMIN;
    if (!playlist || !canSee) throw new NotFoundException('Playlist not found');
    return playlist;
  }

  private withTracks(id: string) {
    return this.prisma.playlist.findUnique({
      where: { id },
      include: {
        ...listInclude,
        tracks: {
          orderBy: { position: 'asc' },
          include: { track: { include: trackInclude } },
        },
      },
    });
  }

  create(ownerId: string, dto: CreatePlaylistDto) {
    return this.prisma.playlist.create({ data: { ...dto, ownerId } });
  }

  update(id: string, dto: UpdatePlaylistDto) {
    return this.prisma.playlist.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.prisma.playlist.delete({ where: { id } });
  }

  /** Appends at the end. Duplicate → 409 (composite PK), unknown track → 409 (FK). */
  addTrack(playlistId: string, trackId: string) {
    return this.prisma.$transaction(async (tx) => {
      const { _max } = await tx.playlistTrack.aggregate({
        where: { playlistId },
        _max: { position: true },
      });
      return tx.playlistTrack.create({
        data: { playlistId, trackId, position: (_max.position ?? -1) + 1 },
      });
    });
  }

  /** Removes a track and closes the gap so positions stay 0..n-1. */
  async removeTrack(playlistId: string, trackId: string) {
    await this.prisma.$transaction(async (tx) => {
      const removed = await tx.playlistTrack.delete({
        where: { playlistId_trackId: { playlistId, trackId } },
      });
      await tx.playlistTrack.updateMany({
        where: { playlistId, position: { gt: removed.position } },
        data: { position: { decrement: 1 } },
      });
    });
  }

  /** All-or-nothing reorder: either every position is rewritten or none. */
  async reorder(playlistId: string, trackIds: string[]) {
    await this.prisma.$transaction(async (tx) => {
      const current = await tx.playlistTrack.findMany({
        where: { playlistId },
        select: { trackId: true },
      });
      const ids = new Set(current.map((t) => t.trackId));
      if (ids.size !== trackIds.length || !trackIds.every((t) => ids.has(t))) {
        throw new BadRequestException(
          'trackIds must contain exactly the tracks of the playlist',
        );
      }
      await Promise.all(
        trackIds.map((trackId, position) =>
          tx.playlistTrack.update({
            where: { playlistId_trackId: { playlistId, trackId } },
            data: { position },
          }),
        ),
      );
    });
    return this.withTracks(playlistId);
  }
}
