import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { paginate, pageArgs } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import { AlbumQueryDto, CreateAlbumDto, UpdateAlbumDto } from './albums.dto';

const toDate = (d?: string) => (d ? new Date(d) : undefined);

@Injectable()
export class AlbumsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: AlbumQueryDto) {
    const where: Prisma.AlbumWhereInput = {
      artistId: query.artistId,
      title: query.q ? { contains: query.q, mode: 'insensitive' } : undefined,
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.album.findMany({
        where,
        include: { artist: { select: { id: true, name: true } } },
        orderBy: { releaseDate: 'desc' },
        ...pageArgs(query),
      }),
      this.prisma.album.count({ where }),
    ]);
    return paginate(data, total, query);
  }

  findOne(id: string) {
    return this.prisma.album.findUniqueOrThrow({
      where: { id },
      include: {
        artist: { select: { id: true, name: true } },
        tracks: { orderBy: { trackNumber: 'asc' } },
      },
    });
  }

  create({ releaseDate, ...dto }: CreateAlbumDto) {
    return this.prisma.album.create({
      data: { ...dto, releaseDate: toDate(releaseDate) },
    });
  }

  update(id: string, { releaseDate, ...dto }: UpdateAlbumDto) {
    return this.prisma.album.update({
      where: { id },
      data: { ...dto, releaseDate: toDate(releaseDate) },
    });
  }

  async remove(id: string) {
    await this.prisma.album.delete({ where: { id } });
  }
}
