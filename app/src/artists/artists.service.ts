import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import {
  paginate,
  PaginationQueryDto,
  pageArgs,
} from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateArtistDto, UpdateArtistDto } from './artists.dto';

@Injectable()
export class ArtistsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const where: Prisma.ArtistWhereInput = query.q
      ? { name: { contains: query.q, mode: 'insensitive' } }
      : {};
    const [data, total] = await this.prisma.$transaction([
      this.prisma.artist.findMany({
        where,
        orderBy: { name: 'asc' },
        ...pageArgs(query),
      }),
      this.prisma.artist.count({ where }),
    ]);
    return paginate(data, total, query);
  }

  findOne(id: string) {
    return this.prisma.artist.findUniqueOrThrow({
      where: { id },
      include: {
        albums: { orderBy: { releaseDate: 'desc' } },
        _count: { select: { tracks: true } },
      },
    });
  }

  create(dto: CreateArtistDto) {
    return this.prisma.artist.create({ data: dto });
  }

  update(id: string, dto: UpdateArtistDto) {
    return this.prisma.artist.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.prisma.artist.delete({ where: { id } });
  }
}
