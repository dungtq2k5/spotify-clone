import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Role } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { PlaylistsService } from './playlists.service';

describe('PlaylistsService', () => {
  const prisma = {
    playlist: { findUnique: jest.fn() },
    playlistTrack: {
      findMany: jest.fn(),
      update: jest.fn(),
      aggregate: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  // Interactive transactions just run the callback against the same mock.
  prisma.$transaction.mockImplementation((fn: (tx: unknown) => unknown) =>
    fn(prisma),
  );
  const service = new PlaylistsService(prisma as unknown as PrismaService);
  const owner = { id: 'owner', email: 'o@x.y', role: Role.USER };
  const stranger = { id: 'other', email: 's@x.y', role: Role.USER };
  const admin = { id: 'admin', email: 'a@x.y', role: Role.ADMIN };

  beforeEach(() => jest.clearAllMocks());

  describe('findOne visibility', () => {
    beforeEach(() =>
      prisma.playlist.findUnique.mockResolvedValue({
        id: 'p1',
        ownerId: owner.id,
        isPublic: false,
      }),
    );

    it('shows a private playlist to its owner and to admins', async () => {
      await expect(service.findOne('p1', owner)).resolves.toBeDefined();
      await expect(service.findOne('p1', admin)).resolves.toBeDefined();
    });

    it('hides a private playlist from others and anonymous users (404)', async () => {
      await expect(service.findOne('p1', stranger)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('p1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('reorder', () => {
    beforeEach(() =>
      prisma.playlistTrack.findMany.mockResolvedValue([
        { trackId: 'a' },
        { trackId: 'b' },
      ]),
    );

    it('writes the new positions', async () => {
      await service.reorder('p1', ['b', 'a']);
      expect(prisma.playlistTrack.update).toHaveBeenCalledWith({
        where: { playlistId_trackId: { playlistId: 'p1', trackId: 'b' } },
        data: { position: 0 },
      });
      expect(prisma.playlistTrack.update).toHaveBeenCalledWith({
        where: { playlistId_trackId: { playlistId: 'p1', trackId: 'a' } },
        data: { position: 1 },
      });
    });

    it.each([[['a']], [['a', 'c']], [['a', 'b', 'c']]])(
      'rejects %j (not exactly the playlist tracks)',
      async (ids) => {
        await expect(service.reorder('p1', ids)).rejects.toThrow(
          BadRequestException,
        );
        expect(prisma.playlistTrack.update).not.toHaveBeenCalled();
      },
    );
  });

  it('appends new tracks after the last position', async () => {
    prisma.playlistTrack.aggregate.mockResolvedValue({
      _max: { position: 4 },
    });
    await service.addTrack('p1', 't1');
    expect(prisma.playlistTrack.create).toHaveBeenCalledWith({
      data: { playlistId: 'p1', trackId: 't1', position: 5 },
    });
  });
});
