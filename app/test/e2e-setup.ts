import { config } from 'dotenv';
import Redis from 'ioredis';
import { execSync } from 'node:child_process';

/** Fresh, seeded test database + empty Redis db before the e2e run. */
export default async function setup() {
  config({ path: '.env.test', override: true, quiet: true });
  const url = process.env.DATABASE_URL!;
  if (!/_test(\?|$)/.test(url)) {
    throw new Error(`Refusing to wipe a non-test database: ${url}`);
  }

  const run = (cmd: string, input?: string) =>
    execSync(cmd, {
      input,
      stdio: [input ? 'pipe' : 'ignore', 'ignore', 'inherit'],
    });
  run('pnpm prisma migrate deploy');
  run(
    'pnpm prisma db execute --stdin',
    'TRUNCATE "User", "Artist", "Playlist" RESTART IDENTITY CASCADE;',
  );
  run('pnpm tsx prisma/seed.ts --mock');

  const redis = new Redis(process.env.REDIS_URL!);
  await redis.flushdb();
  await redis.quit();
}
