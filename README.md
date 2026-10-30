# Spotify Clone API — NestJS showcase

A small Spotify-like REST API built to demonstrate **NestJS** mechanisms: modules & DI, guards (JWT + RBAC + ownership), pipes, interceptors, exception filters, custom decorators, dynamic modules. It also uses **Prisma + PostgreSQL**, **Redis caching & rate limiting**, **Swagger**, and **unit / e2e / system tests** with Jest.

No frontend: use Swagger UI at **http://localhost:3000/docs**.

## Quick start (one command)

Requires Docker.

```bash
docker compose up --build
```

This starts Postgres, Redis and the API, applies migrations and seeds demo data. Then open:

- Swagger UI: http://localhost:3000/docs (click **Authorize** and paste an `accessToken` from `POST /api/auth/login`)
- Health: http://localhost:3000/api/health

Host ports: API `3000`, Postgres `5440`, Redis `6390`. Override them with `APP_HOST_PORT`, `POSTGRES_HOST_PORT` and `REDIS_HOST_PORT`. Set `SEED_MOCK=false` to seed only the admin account.

### Demo accounts

| Email | Password | Role |
| --- | --- | --- |
| `admin@spotify.local` | `Admin123!` | ADMIN |
| `user@spotify.local` | `User123!` | USER |
| `jane@spotify.local` | `Jane123!` | USER |

## Local development

Requires Node 24 and pnpm 10 (`corepack enable`).

```bash
docker compose up -d postgres redis   # infrastructure only
cd app
cp .env.example .env
pnpm install                          # also runs prisma generate
pnpm db:deploy                        # apply migrations
pnpm db:seed:mock                     # admin + demo data (pnpm db:seed = admin only)
pnpm start:dev                        # http://localhost:3000
```

| Script | What it does |
| --- | --- |
| `pnpm start:dev` | Watch mode |
| `pnpm build` / `pnpm start:prod` | Compile / run `dist` |
| `pnpm lint` / `pnpm format` | ESLint / Prettier |
| `pnpm db:migrate` | Create + apply a migration after editing `prisma/schema.prisma` |
| `pnpm db:deploy` | Apply pending migrations |
| `pnpm db:seed` / `pnpm db:seed:mock` | Seed system data / system + mock data (idempotent) |
| `pnpm test` / `pnpm test:cov` | Unit tests / with coverage |
| `pnpm test:e2e` | E2E: whole app + real Postgres/Redis (uses `.env.test`, resets the `spotify_test` DB) |
| `pnpm test:system` | System: black-box tests against a running stack (`BASE_URL`, default `http://localhost:3000`) |

## API at a glance

All routes are under `/api`. Full schema at `/docs-json`.

| Area | Endpoints |
| --- | --- |
| Auth | `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout` |
| Users | `GET /users/me` · admin: `GET /users`, `PATCH /users/:id/role` |
| Catalog | `GET /artists`, `/albums`, `/tracks`, `/tracks/top`, `/…/:id` (public, cached) · admin: `POST/PATCH/DELETE` |
| Playlists | `GET /playlists` (public), `/playlists/mine`, `/playlists/:id` · `POST /playlists` · owner/admin: `PATCH/DELETE /playlists/:id`, `POST /playlists/:id/tracks`, `DELETE /playlists/:id/tracks/:trackId`, `PUT /playlists/:id/tracks/order` |
| Library | `PUT/DELETE /tracks/:id/like`, `GET /me/likes`, `POST /tracks/:id/play` (30/min per user) |
| Ops | `GET /health` |

Lists accept `?page=&limit=&q=` and return `{ data, meta: { page, limit, total, totalPages } }`.

## Documentation

See [`docs/`](docs/README.md): product overview, architecture & tech stack, data model, course requirements and the course checklist (where each required NestJS mechanism lives in the code).

## AI Disclosure

This project was developed with the help of an AI coding assistant (Claude Code). It was used to scaffold the project, write the code, tests, Docker/CI setup and these docs. It also debugged issues along the way, such as Prisma 7 + Jest dynamic imports, Docker client generation and a playlist-reorder visibility bug.

How the output was checked:

- Every feature was run against a real Postgres/Redis (manual curl smoke tests, then automated e2e and system tests).
- Library choices were checked against installed package metadata. For example, NestJS 11 was chosen over 12 because v12 packages are ESM-only.
- Team members are responsible for reading, understanding and being able to explain or modify every file without AI, as the course requires. Where the code doesn't match the official NestJS/Prisma documentation, the documentation wins.
