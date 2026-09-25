import {
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { PlaylistOwnerGuard } from './playlist-owner.guard';

const ID = '11111111-1111-4111-8111-111111111111';

describe('PlaylistOwnerGuard', () => {
  const findUnique = jest.fn();
  const guard = new PlaylistOwnerGuard({
    playlist: { findUnique },
  } as unknown as PrismaService);
  const ctx = (id: string, user: { id: string; role: Role }) =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ params: { id }, user }) }),
    }) as unknown as ExecutionContext;

  beforeEach(() => findUnique.mockResolvedValue({ ownerId: 'owner' }));

  it('allows the owner', async () => {
    await expect(
      guard.canActivate(ctx(ID, { id: 'owner', role: Role.USER })),
    ).resolves.toBe(true);
  });

  it('allows an admin', async () => {
    await expect(
      guard.canActivate(ctx(ID, { id: 'x', role: Role.ADMIN })),
    ).resolves.toBe(true);
  });

  it('forbids another user', async () => {
    await expect(
      guard.canActivate(ctx(ID, { id: 'x', role: Role.USER })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('404s for a missing playlist or a malformed id', async () => {
    findUnique.mockResolvedValue(null);
    await expect(
      guard.canActivate(ctx(ID, { id: 'owner', role: Role.USER })),
    ).rejects.toThrow(NotFoundException);
    await expect(
      guard.canActivate(ctx('nope', { id: 'owner', role: Role.USER })),
    ).rejects.toThrow(NotFoundException);
  });
});
