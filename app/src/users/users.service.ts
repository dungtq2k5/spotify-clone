import { Injectable } from '@nestjs/common';
import { Prisma, Role, User } from '../generated/prisma/client';
import {
  paginate,
  PaginationQueryDto,
  pageArgs,
} from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';

/** Columns safe to return to clients (never the password hash). */
export const publicUserSelect = {
  id: true,
  email: true,
  displayName: true,
  role: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export const toPublicUser = ({
  id,
  email,
  displayName,
  role,
  createdAt,
}: User) => ({
  id,
  email,
  displayName,
  role,
  createdAt,
});

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Duplicate email → P2002 → 409 via PrismaExceptionFilter. */
  create(data: Prisma.UserCreateInput) {
    return this.prisma.user.create({ data });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id },
      select: publicUserSelect,
    });
  }

  async findAll(query: PaginationQueryDto) {
    const where: Prisma.UserWhereInput = query.q
      ? {
          OR: [
            { email: { contains: query.q, mode: 'insensitive' } },
            { displayName: { contains: query.q, mode: 'insensitive' } },
          ],
        }
      : {};
    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: publicUserSelect,
        orderBy: { createdAt: 'desc' },
        ...pageArgs(query),
      }),
      this.prisma.user.count({ where }),
    ]);
    return paginate(data, total, query);
  }

  updateRole(id: string, role: Role) {
    return this.prisma.user.update({
      where: { id },
      data: { role },
      select: publicUserSelect,
    });
  }
}
