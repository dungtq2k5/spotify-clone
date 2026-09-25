import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import { createHash } from 'node:crypto';
import { Role } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

const TOKEN_ID = '11111111-1111-4111-8111-111111111111';
const SECRET = 'plain-secret';
const user = {
  id: 'u1',
  email: 'user@test.local',
  displayName: 'User',
  role: Role.USER,
  passwordHash: '',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('AuthService', () => {
  let auth: AuthService;
  const users = { findByEmail: jest.fn(), create: jest.fn() };
  const prisma = {
    refreshToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn(prisma)),
  };

  const storedToken = (over: object = {}) => ({
    id: TOKEN_ID,
    userId: user.id,
    tokenHash: createHash('sha256').update(SECRET).digest('hex'),
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
    user,
    ...over,
  });

  beforeAll(async () => {
    user.passwordHash = await argon2.hash('Password1!');
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.refreshToken.create.mockResolvedValue({ id: 'new-id' });
    // Real JwtService, fake persistence: providers are swapped through DI.
    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'test-secret' })],
      providers: [
        AuthService,
        { provide: UsersService, useValue: users },
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: { getOrThrow: () => 7 },
        },
      ],
    }).compile();
    auth = moduleRef.get(AuthService);
  });

  describe('login', () => {
    it('issues tokens and never returns the password hash', async () => {
      users.findByEmail.mockResolvedValue(user);
      const res = await auth.login({
        email: user.email,
        password: 'Password1!',
      });
      expect(res.accessToken).toEqual(expect.any(String));
      expect(res.refreshToken).toMatch(/^new-id\./);
      expect(res.user).not.toHaveProperty('passwordHash');
    });

    it('rejects a wrong password', async () => {
      users.findByEmail.mockResolvedValue(user);
      await expect(
        auth.login({ email: user.email, password: 'nope' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects an unknown email with the same error', async () => {
      users.findByEmail.mockResolvedValue(null);
      await expect(
        auth.login({ email: 'x@y.z', password: 'Password1!' }),
      ).rejects.toThrow('Invalid email or password');
    });
  });

  describe('refresh', () => {
    it('rotates: revokes the old token and issues a new pair', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(storedToken());
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      const res = await auth.refresh(`${TOKEN_ID}.${SECRET}`);

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { id: TOKEN_ID, revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      expect(res.refreshToken).toMatch(/^new-id\./);
    });

    it('treats reuse of a revoked token as theft and revokes all sessions', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(
        storedToken({ revokedAt: new Date() }),
      );
      await expect(auth.refresh(`${TOKEN_ID}.${SECRET}`)).rejects.toThrow(
        'Refresh token reuse detected',
      );
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('rejects a wrong secret', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(storedToken());
      await expect(auth.refresh(`${TOKEN_ID}.wrong`)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects an expired token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(
        storedToken({ expiresAt: new Date(Date.now() - 1) }),
      );
      await expect(auth.refresh(`${TOKEN_ID}.${SECRET}`)).rejects.toThrow(
        'Refresh token expired',
      );
    });

    it('rejects malformed tokens without hitting the database', async () => {
      await expect(auth.refresh('not-a-token')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(prisma.refreshToken.findUnique).not.toHaveBeenCalled();
    });
  });
});
