import { validateEnv } from './env.validation';

const base = {
  DATABASE_URL: 'postgresql://x',
  REDIS_URL: 'redis://x',
  JWT_ACCESS_SECRET: 'x'.repeat(32),
};

describe('validateEnv', () => {
  it('applies defaults and converts numeric strings', () => {
    const env = validateEnv({ ...base, PORT: '4000' });
    expect(env.PORT).toBe(4000);
    expect(env.THROTTLE_LIMIT).toBe(100);
  });

  it('fails fast on a missing or weak secret', () => {
    expect(() => validateEnv({ ...base, JWT_ACCESS_SECRET: 'short' })).toThrow(
      /JWT_ACCESS_SECRET/,
    );
    expect(() => validateEnv({ REDIS_URL: 'r' })).toThrow(/DATABASE_URL/);
  });
});
