import { Injectable } from '@nestjs/common';
import {
  paginate,
  PaginationQueryDto,
  pageArgs,
} from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import { trackInclude } from '../tracks/tracks.service';

@Injectable()
export class LibraryService {
  constructor(private readonly prisma: PrismaService) {}

  /** Idempotent: liking twice is a no-op. Unknown track → 409 (FK). */
  async like(userId: string, trackId: string) {
    await this.prisma.like.upsert({
      where: { userId_trackId: { userId, trackId } },
      create: { userId, trackId },
      update: {},
    });
  }

  async unlike(userId: string, trackId: string) {
    await this.prisma.like.deleteMany({ where: { userId, trackId } });
  }

  async likedTracks(userId: string, query: PaginationQueryDto) {
    const where = { userId };
    const [likes, total] = await this.prisma.$transaction([
      this.prisma.like.findMany({
        where,
        include: { track: { include: trackInclude } },
        orderBy: { createdAt: 'desc' },
        ...pageArgs(query),
      }),
      this.prisma.like.count({ where }),
    ]);
    return paginate(
      likes.map(({ track, createdAt }) => ({ ...track, likedAt: createdAt })),
      total,
      query,
    );
  }

  /** Atomic increment in SQL (no read-modify-write race). */
  play(trackId: string) {
    return this.prisma.track.update({
      where: { id: trackId },
      data: { playCount: { increment: 1 } },
      select: { id: true, playCount: true },
    });
  }
}
