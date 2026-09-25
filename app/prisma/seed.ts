/**
 * Seeds the database.
 *   pnpm db:seed        → system data only (admin account). Safe to re-run.
 *   pnpm db:seed:mock   → system data + demo accounts, catalog, playlists, likes.
 * Mock catalog is skipped if artists already exist.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
import { PrismaClient, Role } from '../src/generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

export const ACCOUNTS = [
  {
    email: 'admin@spotify.local',
    password: 'Admin123!',
    displayName: 'Admin',
    role: Role.ADMIN,
  },
  {
    email: 'user@spotify.local',
    password: 'User123!',
    displayName: 'Demo User',
    role: Role.USER,
  },
  {
    email: 'jane@spotify.local',
    password: 'Jane123!',
    displayName: 'Jane Listener',
    role: Role.USER,
  },
];

const ARTISTS = [
  { name: 'Neon Harbor', genre: 'synthwave' },
  { name: 'The Paper Lanterns', genre: 'indie folk' },
  { name: 'Mira Vale', genre: 'pop' },
  { name: 'Low Orbit', genre: 'lo-fi' },
  { name: 'Brass & Bones', genre: 'jazz' },
  { name: 'Static Bloom', genre: 'rock' },
];
const WORDS = [
  'Midnight',
  'Echo',
  'Golden',
  'Drift',
  'Paper',
  'Signal',
  'River',
  'Glass',
  'Summer',
  'Static',
  'Velvet',
  'Orbit',
];
const NOUNS = [
  'Hearts',
  'Lights',
  'Roads',
  'Waves',
  'Skies',
  'Machines',
  'Letters',
  'Dreams',
];

/** Deterministic pseudo-random so every seed run produces the same data. */
let seed = 42;
const rand = (n: number) => (seed = (seed * 16807) % 2147483647) % n;

async function upsertUser(a: (typeof ACCOUNTS)[number]) {
  return prisma.user.upsert({
    where: { email: a.email },
    update: {},
    create: {
      email: a.email,
      displayName: a.displayName,
      role: a.role,
      passwordHash: await argon2.hash(a.password),
    },
  });
}

async function seedSystem() {
  await upsertUser(ACCOUNTS[0]);
  console.log(`✔ system: admin account ${ACCOUNTS[0].email}`);
}

async function seedMock() {
  const [, user, jane] = await Promise.all(ACCOUNTS.map(upsertUser));
  console.log('✔ mock: demo accounts');

  if (await prisma.artist.count()) {
    console.log('↷ mock: catalog already present, skipped');
    return;
  }

  const trackIds: string[] = [];
  for (const [i, a] of ARTISTS.entries()) {
    const artist = await prisma.artist.create({
      data: {
        name: a.name,
        bio: `${a.name} is a fictional ${a.genre} act used for demo data.`,
        imageUrl: `https://picsum.photos/seed/artist${i}/400`,
      },
    });
    for (let al = 0; al < 2; al++) {
      const title = `${WORDS[rand(WORDS.length)]} ${NOUNS[rand(NOUNS.length)]}`;
      const album = await prisma.album.create({
        data: {
          title,
          artistId: artist.id,
          releaseDate: new Date(
            Date.UTC(2015 + rand(10), rand(12), 1 + rand(28)),
          ),
          coverUrl: `https://picsum.photos/seed/album${i}-${al}/400`,
        },
      });
      for (let t = 1; t <= 5; t++) {
        const track = await prisma.track.create({
          data: {
            title: `${WORDS[rand(WORDS.length)]} ${NOUNS[rand(NOUNS.length)]}`,
            durationSec: 150 + rand(180),
            audioUrl: `https://cdn.example.com/audio/${artist.id}/${album.id}/${t}.mp3`,
            trackNumber: t,
            playCount: rand(5000),
            artistId: artist.id,
            albumId: album.id,
          },
        });
        trackIds.push(track.id);
      }
    }
  }
  console.log(
    `✔ mock: ${ARTISTS.length} artists, ${ARTISTS.length * 2} albums, ${trackIds.length} tracks`,
  );

  const pick = (n: number) => [
    ...new Set(
      Array.from({ length: n }, () => trackIds[rand(trackIds.length)]),
    ),
  ];
  const playlists: [string, string, boolean, string[]][] = [
    [user.id, 'Morning Focus', true, pick(8)],
    [user.id, 'Guilty Pleasures', false, pick(5)],
    [jane.id, 'Road Trip', true, pick(10)],
  ];
  for (const [ownerId, name, isPublic, ids] of playlists) {
    await prisma.playlist.create({
      data: {
        ownerId,
        name,
        isPublic,
        tracks: {
          create: ids.map((trackId, position) => ({ trackId, position })),
        },
      },
    });
  }
  await prisma.like.createMany({
    data: [
      ...pick(12).map((trackId) => ({ userId: user.id, trackId })),
      ...pick(12).map((trackId) => ({ userId: jane.id, trackId })),
    ],
    skipDuplicates: true,
  });
  console.log('✔ mock: playlists and likes');
}

async function main() {
  await seedSystem();
  if (process.argv.includes('--mock')) await seedMock();
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
