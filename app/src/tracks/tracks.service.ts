import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { paginate, pageArgs } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTrackDto, TrackQueryDto, UpdateTrackDto } from './tracks.dto';

/** Relations embedded in every track response. */
export const trackInclude = {
  artist: { select: { id: true, name: true } },
  album: { select: { id: true, title: true, coverUrl: true } },
} satisfies Prisma.TrackInclude;

@Injectable()
export class TracksService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: TrackQueryDto) {
    const where: Prisma.TrackWhereInput = {
      artistId: query.artistId,
      albumId: query.albumId,
      title: query.q ? { contains: query.q, mode: 'insensitive' } : undefined,
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.track.findMany({
        where,
        include: trackInclude,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        ...pageArgs(query),
      }),
      this.prisma.track.count({ where }),
    ]);
    return paginate(data, total, query);
  }

  /** Most played tracks (served from the `playCount` desc index). */
  top(limit: number) {
    return this.prisma.track.findMany({
      include: trackInclude,
      orderBy: { playCount: 'desc' },
      take: limit,
    });
  }

  findOne(id: string) {
    return this.prisma.track.findUniqueOrThrow({
      where: { id },
      include: { ...trackInclude, _count: { select: { likes: true } } },
    });
  }

  create(dto: CreateTrackDto) {
    return this.prisma.track.create({ data: dto, include: trackInclude });
  }

  update(id: string, dto: UpdateTrackDto) {
    return this.prisma.track.update({
      where: { id },
      data: dto,
      include: trackInclude,
    });
  }

  async remove(id: string) {
    await this.prisma.track.delete({ where: { id } });
  }
}
