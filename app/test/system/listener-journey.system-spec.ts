/**
 * System test: black-box user journeys against a running deployment
 * (default: `docker compose up` with SEED_MOCK=true). Only HTTP, no app imports.
 *   BASE_URL=http://host:port pnpm test:system
 */
const BASE = `${process.env.BASE_URL ?? 'http://localhost:3000'}/api`;

type Json = Record<string, any>;
async function call(
  method: string,
  path: string,
  { token, body }: { token?: string; body?: unknown } = {},
) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token && { authorization: `Bearer ${token}` }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return {
    status: res.status,
    headers: res.headers,
    body: (text ? JSON.parse(text) : {}) as Json,
  };
}

describe('System: deployed stack', () => {
  it('is healthy, hardened and self-documented', async () => {
    const health = await call('GET', '/health');
    expect(health.status).toBe(200);
    expect(health.body.status).toBe('ok');
    expect(health.headers.get('x-request-id')).toBeTruthy();
    expect(health.headers.get('x-content-type-options')).toBe('nosniff');

    const docs = await fetch(BASE.replace(/\/api$/, '/docs-json'));
    expect(docs.status).toBe(200);
    const spec = (await docs.json()) as Json;
    expect(Object.keys(spec.paths as Json)).toEqual(
      expect.arrayContaining(['/api/auth/login', '/api/playlists/{id}']),
    );
  });

  it('serves seeded catalog to anonymous visitors', async () => {
    const top = await call('GET', '/tracks/top?limit=5');
    expect(top.status).toBe(200);
    expect(top.body).toHaveLength(5);
    const counts = (top.body as unknown as Json[]).map((t) => t.playCount);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));

    const artists = await call('GET', '/artists?q=neon');
    expect(artists.body.data[0].name).toBe('Neon Harbor');
  });
});

describe('System: listener journey', () => {
  const email = `listener-${Date.now()}@example.com`;
  let access: string;
  let refresh: string;
  let playlistId: string;
  let trackIds: string[];

  it('signs up and sees their profile', async () => {
    const reg = await call('POST', '/auth/register', {
      body: { email, password: 'Password1!', displayName: 'Sys Listener' },
    });
    expect(reg.status).toBe(201);
    ({ accessToken: access, refreshToken: refresh } = reg.body);

    const me = await call('GET', '/users/me', { token: access });
    expect(me.body).toMatchObject({ email, role: 'USER' });
  });

  it('builds a public playlist that anyone can view', async () => {
    trackIds = (await call('GET', '/tracks?limit=2')).body.data.map(
      (t: Json) => t.id,
    );
    playlistId = (
      await call('POST', '/playlists', {
        token: access,
        body: { name: 'System Mix', isPublic: true },
      })
    ).body.id;
    for (const trackId of trackIds) {
      const add = await call('POST', `/playlists/${playlistId}/tracks`, {
        token: access,
        body: { trackId },
      });
      expect(add.status).toBe(201);
    }

    const pub = await call('GET', `/playlists/${playlistId}`);
    expect(pub.status).toBe(200);
    expect(pub.body.tracks.map((t: Json) => t.trackId)).toEqual(trackIds);
  });

  it('likes and plays a track', async () => {
    const [trackId] = trackIds;
    expect(
      (await call('PUT', `/tracks/${trackId}/like`, { token: access })).status,
    ).toBe(204);
    const likes = await call('GET', '/me/likes', { token: access });
    expect(likes.body.data.map((t: Json) => t.id)).toContain(trackId);

    const before = (
      await call('POST', `/tracks/${trackId}/play`, { token: access })
    ).body.playCount;
    const after = (
      await call('POST', `/tracks/${trackId}/play`, { token: access })
    ).body.playCount;
    expect(after).toBe(before + 1);
  });

  it('refreshes the session, then logs out for good', async () => {
    const r = await call('POST', '/auth/refresh', {
      body: { refreshToken: refresh },
    });
    expect(r.status).toBe(200);
    expect(
      (await call('GET', '/users/me', { token: r.body.accessToken })).status,
    ).toBe(200);

    await call('POST', '/auth/logout', {
      body: { refreshToken: r.body.refreshToken },
    });
    const again = await call('POST', '/auth/refresh', {
      body: { refreshToken: r.body.refreshToken },
    });
    expect(again.status).toBe(401);
  });
});

describe('System: admin curates the catalog', () => {
  let admin: string;
  let listener: string;

  beforeAll(async () => {
    admin = (
      await call('POST', '/auth/login', {
        body: { email: 'admin@spotify.local', password: 'Admin123!' },
      })
    ).body.accessToken;
    listener = (
      await call('POST', '/auth/login', {
        body: { email: 'user@spotify.local', password: 'User123!' },
      })
    ).body.accessToken;
  });

  it('new track is searchable immediately (cache invalidated), removable only by admin', async () => {
    const title = `System Single ${Date.now()}`;
    const q = `/tracks?q=${encodeURIComponent(title)}`;
    expect((await call('GET', q)).body.meta.total).toBe(0); // now cached

    const artistId = (await call('GET', '/artists?limit=1')).body.data[0].id;
    const created = await call('POST', '/tracks', {
      token: admin,
      body: {
        title,
        durationSec: 200,
        audioUrl: 'https://cdn.example.com/audio/system.mp3',
        artistId,
      },
    });
    expect(created.status).toBe(201);

    const found = await call('GET', q);
    expect(found.headers.get('x-cache')).toBe('MISS');
    expect(found.body.meta.total).toBe(1);

    const path = `/tracks/${created.body.id}`;
    expect((await call('DELETE', path, { token: listener })).status).toBe(403);
    expect((await call('DELETE', path, { token: admin })).status).toBe(204);
    expect((await call('GET', path)).status).toBe(404);
  });
});
