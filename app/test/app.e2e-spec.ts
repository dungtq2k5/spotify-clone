import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';

/**
 * Full HTTP stack (guards, pipes, interceptors, filters) against a real
 * Postgres + Redis test database seeded by e2e-setup.ts.
 */
describe('Spotify Clone API (e2e)', () => {
  let app: INestApplication<App>;
  let http: () => ReturnType<typeof request>;
  const tokens: Record<'admin' | 'user' | 'jane', string> = {
    admin: '',
    user: '',
    jane: '',
  };
  const auth = (who: keyof typeof tokens) => ({
    Authorization: `Bearer ${tokens[who]}`,
  });

  const login = async (email: string, password: string) =>
    request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = setupApp(moduleRef.createNestApplication({ logger: ['error'] }));
    await app.init();
    http = () => request(app.getHttpServer());

    tokens.admin = (
      await login('admin@spotify.local', 'Admin123!')
    ).body.accessToken;
    tokens.user = (
      await login('user@spotify.local', 'User123!')
    ).body.accessToken;
    tokens.jane = (
      await login('jane@spotify.local', 'Jane123!')
    ).body.accessToken;
  });

  afterAll(() => app.close());

  it('GET /api/health reports db and redis up, with a request id', async () => {
    const res = await http().get('/api/health').expect(200);
    expect(res.body.info).toEqual({
      database: { status: 'up' },
      redis: { status: 'up' },
    });
    expect(res.headers['x-request-id']).toBeDefined();
  });

  describe('auth', () => {
    it('registers a user (201) and rejects the duplicate (409)', async () => {
      const body = {
        email: 'New@Example.com',
        password: 'Password1!',
        displayName: 'New',
      };
      const res = await http()
        .post('/api/auth/register')
        .send(body)
        .expect(201);
      expect(res.body.user).toMatchObject({
        email: 'new@example.com',
        role: 'USER',
      });
      expect(res.body.user.passwordHash).toBeUndefined();
      await http().post('/api/auth/register').send(body).expect(409);
    });

    it('ValidationPipe rejects bad input and unknown fields (400)', async () => {
      const res = await http()
        .post('/api/auth/register')
        .send({ email: 'nope', password: 'short', role: 'ADMIN' })
        .expect(400);
      expect(res.body.message).toEqual(
        expect.arrayContaining([
          'property role should not exist',
          'email must be an email',
        ]),
      );
    });

    it('rotates refresh tokens and detects reuse', async () => {
      const { refreshToken } = (await login('jane@spotify.local', 'Jane123!'))
        .body;
      const rotated = await http()
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);
      expect(rotated.body.refreshToken).not.toBe(refreshToken);

      // Old token again → reuse → every session of the user is revoked.
      await http().post('/api/auth/refresh').send({ refreshToken }).expect(401);
      await http()
        .post('/api/auth/refresh')
        .send({ refreshToken: rotated.body.refreshToken })
        .expect(401);
    });

    it('rejects a wrong password (401)', () =>
      http()
        .post('/api/auth/login')
        .send({ email: 'user@spotify.local', password: 'wrong-password' })
        .expect(401));
  });

  describe('RBAC', () => {
    const artist = { name: 'E2E Artist' };

    it('401 without token on a protected route', () =>
      http().get('/api/users/me').expect(401));

    it('403 for USER on an admin route', () =>
      http().post('/api/artists').set(auth('user')).send(artist).expect(403));

    it('201 for ADMIN on an admin route', () =>
      http().post('/api/artists').set(auth('admin')).send(artist).expect(201));

    it('admin-only user listing is paginated', async () => {
      const res = await http()
        .get('/api/users?limit=2')
        .set(auth('admin'))
        .expect(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta).toMatchObject({ page: 1, limit: 2 });
      expect(res.body.meta.total).toBeGreaterThanOrEqual(3);
    });
  });

  describe('catalog + cache', () => {
    it('paginates and searches tracks', async () => {
      const res = await http().get('/api/tracks?page=2&limit=5').expect(200);
      expect(res.body.data).toHaveLength(5);
      expect(res.body.meta).toEqual({
        page: 2,
        limit: 5,
        total: 60,
        totalPages: 12,
      });
      await http().get('/api/tracks?limit=500').expect(400);
    });

    it('MISS → HIT → admin write invalidates → MISS', async () => {
      const url = '/api/artists?q=cache-test';
      expect((await http().get(url)).headers['x-cache']).toBe('MISS');
      expect((await http().get(url)).headers['x-cache']).toBe('HIT');

      await http()
        .post('/api/artists')
        .set(auth('admin'))
        .send({ name: 'cache-test band' })
        .expect(201);

      const after = await http().get(url);
      expect(after.headers['x-cache']).toBe('MISS');
      expect(after.body.data).toHaveLength(1);
    });

    it('maps bad ids: malformed → 400 (pipe), missing → 404 (filter)', async () => {
      await http().get('/api/tracks/not-a-uuid').expect(400);
      await http()
        .get('/api/tracks/00000000-0000-4000-8000-000000000000')
        .expect(404);
    });
  });

  describe('playlists', () => {
    let playlistId: string;
    let trackIds: string[];

    beforeAll(async () => {
      trackIds = (await http().get('/api/tracks?limit=3')).body.data.map(
        (t: { id: string }) => t.id,
      );
      playlistId = (
        await http()
          .post('/api/playlists')
          .set(auth('user'))
          .send({ name: 'Secret', isPublic: false })
          .expect(201)
      ).body.id;
      for (const trackId of trackIds) {
        await http()
          .post(`/api/playlists/${playlistId}/tracks`)
          .set(auth('user'))
          .send({ trackId })
          .expect(201);
      }
    });

    it('private playlist is 404 for others, visible to the owner', async () => {
      await http().get(`/api/playlists/${playlistId}`).expect(404);
      await http()
        .get(`/api/playlists/${playlistId}`)
        .set(auth('jane'))
        .expect(404);
      await http()
        .get(`/api/playlists/${playlistId}`)
        .set(auth('user'))
        .expect(200);
    });

    it('owner guard: jane cannot modify, admin can', async () => {
      await http()
        .patch(`/api/playlists/${playlistId}`)
        .set(auth('jane'))
        .send({ name: 'hacked' })
        .expect(403);
      await http()
        .patch(`/api/playlists/${playlistId}`)
        .set(auth('admin'))
        .send({ name: 'Moderated' })
        .expect(200);
    });

    it('duplicate track → 409', () =>
      http()
        .post(`/api/playlists/${playlistId}/tracks`)
        .set(auth('user'))
        .send({ trackId: trackIds[0] })
        .expect(409));

    it('reorders tracks atomically', async () => {
      const order = [...trackIds].reverse();
      const res = await http()
        .put(`/api/playlists/${playlistId}/tracks/order`)
        .set(auth('user'))
        .send({ trackIds: order })
        .expect(200);
      expect(
        res.body.tracks.map((t: { trackId: string }) => t.trackId),
      ).toEqual(order);
    });

    it('removing a track closes the position gap', async () => {
      await http()
        .delete(`/api/playlists/${playlistId}/tracks/${trackIds[1]}`)
        .set(auth('user'))
        .expect(204);
      const res = await http()
        .get(`/api/playlists/${playlistId}`)
        .set(auth('user'));
      expect(
        res.body.tracks.map((t: { position: number }) => t.position),
      ).toEqual([0, 1]);
    });
  });

  describe('library', () => {
    let trackId: string;
    beforeAll(async () => {
      trackId = (await http().get('/api/tracks?limit=1')).body.data[0].id;
    });

    it('like is idempotent and shows up in /me/likes', async () => {
      const before = (
        await http().get('/api/me/likes?limit=1').set(auth('jane'))
      ).body.meta.total;
      await http().put(`/api/tracks/${trackId}/like`).set(auth('jane'));
      await http().put(`/api/tracks/${trackId}/like`).set(auth('jane'));
      const after = (
        await http().get('/api/me/likes?limit=1').set(auth('jane'))
      ).body.meta.total;
      expect(after - before).toBeLessThanOrEqual(1);
      await http()
        .delete(`/api/tracks/${trackId}/like`)
        .set(auth('jane'))
        .expect(204);
    });

    it('throttles plays per user (30/min) without affecting other users', async () => {
      for (let i = 0; i < 30; i++) {
        await http()
          .post(`/api/tracks/${trackId}/play`)
          .set(auth('user'))
          .expect(200);
      }
      await http()
        .post(`/api/tracks/${trackId}/play`)
        .set(auth('user'))
        .expect(429);
      await http()
        .post(`/api/tracks/${trackId}/play`)
        .set(auth('jane'))
        .expect(200);
    });
  });
});
