import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { isUUID } from 'class-validator';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { Prisma, User } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { toPublicUser, UsersService } from '../users/users.service';
import { LoginDto, RegisterDto } from './auth.dto';
import { JwtPayload } from './auth-user';

const sha256 = (s: string) => createHash('sha256').update(s).digest();

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const user = await this.users.create({
      email: dto.email,
      displayName: dto.displayName,
      passwordHash: await argon2.hash(dto.password),
    });
    return this.issueTokens(user);
  }

  async login({ email, password }: LoginDto) {
    const user = await this.users.findByEmail(email);
    if (!user || !(await argon2.verify(user.passwordHash, password))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.issueTokens(user);
  }

  /**
   * Rotates a refresh token: the old one is revoked and a new pair is issued
   * in one transaction. Presenting an already-revoked token is treated as
   * theft and revokes every session of that user.
   */
  async refresh(token: string) {
    const row = await this.findValidRow(token);
    if (row.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: row.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh token reuse detected');
    }
    if (row.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    return this.prisma.$transaction(async (tx) => {
      // Conditional update: of two concurrent refreshes only one can win.
      const { count } = await tx.refreshToken.updateMany({
        where: { id: row.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      if (count === 0) throw new UnauthorizedException('Refresh token revoked');
      return this.issueTokens(row.user, tx);
    });
  }

  async logout(token: string) {
    const row = await this.findValidRow(token).catch(() => null);
    if (row && !row.revokedAt) {
      await this.prisma.refreshToken.update({
        where: { id: row.id },
        data: { revokedAt: new Date() },
      });
    }
  }

  private async findValidRow(token: string) {
    const [id, secret] = token.split('.');
    if (!isUUID(id) || !secret) throw new UnauthorizedException();
    const row = await this.prisma.refreshToken.findUnique({
      where: { id },
      include: { user: true },
    });
    const hash = sha256(secret);
    if (!row || !timingSafeEqual(Buffer.from(row.tokenHash, 'hex'), hash)) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    return row;
  }

  private async issueTokens(
    user: User,
    db: Prisma.TransactionClient = this.prisma,
  ) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const days = this.config.getOrThrow<number>('REFRESH_TOKEN_TTL_DAYS');
    const secret = randomBytes(32).toString('base64url');
    const row = await db.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(secret).toString('hex'),
        expiresAt: new Date(Date.now() + days * 86_400_000),
      },
    });
    return {
      accessToken: await this.jwt.signAsync(payload),
      refreshToken: `${row.id}.${secret}`,
      expiresIn: this.config.getOrThrow<number>('JWT_ACCESS_TTL'),
      user: toPublicUser(user),
    };
  }
}
