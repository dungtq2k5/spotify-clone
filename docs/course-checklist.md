# Course Checklist — NestJS track

Maps every requirement in [course-requirements.md](course-requirements.md) to where it lives in the code. Paths are relative to `app/`.

**Main technology:** NestJS (Backend & API track). **Business domain:** a simple Spotify-like music API. It is kept small on purpose so the framework mechanisms stay visible.

## Tier 1A — mandatory core

| Item | Status | Evidence |
| --- | --- | --- |
| Module: feature → module, import/export providers | ✅ | One module per feature in `src/*/*.module.ts`. `UsersModule` **exports** `UsersService` and `AuthModule` **imports** it. `PrismaModule` is `@Global()`. Graph: [architecture § Module graph](architecture-and-teck-stack.md#module-graph) |
| Controller: routes, HTTP methods, input, delegate | ✅ | `src/*/*.controller.ts`, 37 routes under `/api` (see `/docs`). Controllers only map HTTP to service calls. |
| Provider + DI via constructor | ✅ | All services/guards/filters get dependencies through the constructor, e.g. `AuthService(UsersService, PrismaService, JwtService, ConfigService)`. Nothing is `new`-ed by hand. |
| Minimal flow controller → service → data source + clear errors | ✅ | e.g. `TracksController → TracksService → PrismaService → Postgres`. Errors: 400 (pipe), 401/403 (guards), 404/409 (filter), 429 (throttler). |

## Tier 1B — chosen by need

| Item | Chosen | Why / Evidence |
| --- | --- | --- |
| DTO + ValidationPipe | ✅ | Global `ValidationPipe` (`APP_PIPE` in `app.module.ts`) with `whitelist` + `forbidNonWhitelisted` + `transform`. DTOs in `*.dto.ts`. `ParseUUIDPipe` on ids. Stops `role: "ADMIN"` from being injected at register. |
| Guard for authN/authZ | ✅ | `auth/jwt-auth.guard.ts` (global), `auth/roles.guard.ts` (global RBAC), `playlists/playlist-owner.guard.ts` (resource ownership, uses DI), `common/guards/user-throttler.guard.ts` (extends `ThrottlerGuard`) |
| Interceptor | ✅ | `common/interceptors/http-cache.interceptor.ts`: Redis read-through cache + invalidation, `X-Cache` header |
| Exception Filter | ✅ | `common/filters/prisma-exception.filter.ts`: Prisma P2002/P2003/P2025 → 409/409/404 |
| Custom decorators | ✅ | `auth/decorators.ts`: `@Public()`, `@Roles([...])`, `@CurrentUser('id')` |
| Dynamic module / config | ✅ | `ConfigModule.forRoot({ validate })`, `CacheModule.registerAsync`, `ThrottlerModule.forRootAsync`, `JwtModule.registerAsync` |
| ORM + transactions | ✅ | Prisma 7. Transactions in `auth.service.ts` (token rotation) and `playlists.service.ts` (add/remove/reorder) |
| Middleware (extra) | ✅ | `common/request-logger.middleware.ts`: request id + access log (explains why this is middleware, not an interceptor) |
| Request-scoped providers | ❌ not chosen | Nothing needs per-request instances; `req.user` covers per-request data. Request scope would also cascade to every dependent provider. |
| Microservices / WebSocket gateways / queues | ❌ not chosen | Out of scope (time; course warns against it) |

### Minimum evidence

- **Module diagram and request flow for a real endpoint**: [architecture § Request lifecycle](architecture-and-teck-stack.md#request-lifecycle) (`POST /api/playlists/:id/tracks`).
- **An injected dependency and its lifecycle**: `PrismaService`. It's a singleton, gets `ConfigService` injected in its constructor, and implements `OnModuleDestroy` to disconnect on shutdown (`enableShutdownHooks`).
- **Before/after behaviour at runtime** (runnable via Swagger `/docs` or the e2e suite `test/app.e2e-spec.ts`):
  - Guard: `POST /api/artists` without a token → 401, as USER → 403, as ADMIN → 201.
  - Pipe: `POST /api/auth/register {"email":"nope","role":"ADMIN"}` → 400 listing each violation.
  - Interceptor: `GET /api/artists?q=x` twice → `X-Cache: MISS` then `HIT`. After an admin write → `MISS` again.
  - Filter: registering the same email twice → 409. `GET /api/tracks/<unknown uuid>` → 404.
  - Throttler: the 31st `POST /api/tracks/:id/play` within a minute → 429 for that user only.

### Self-check answers

- **Guard vs Interceptor, and why permissions go in a Guard?** A guard answers one yes/no question, "may this request reach the handler?", and runs **before** interceptors and pipes. It can read route metadata (`@Roles`) through `Reflector`. An interceptor **wraps** the handler (before and after) to transform or cache results, log or time. It runs after guards, so a permission check there would come after other work has already happened, and it isn't what Nest's authorization model expects. A failed guard also gives the standard 403.
- **When is a provider created / in which scope?** Default scope is singleton: created once during bootstrap when the module graph is instantiated, and shared by everything that injects it. `REQUEST` scope creates one per request, `TRANSIENT` one per consumer. All providers here are singletons.
- **Where is bad input stopped?** In the global `ValidationPipe` (DTO rules) and in `ParseUUIDPipe` for path ids, before the controller method runs. Business-level checks that need data (e.g. "reorder list must equal the playlist's tracks") are done in the service, and DB constraints are the last line of defence.

### Live-exam prep (things we can change on the spot)

- Add a role rule: put `@Roles([Role.ADMIN])` on a handler. `RolesGuard` picks it up automatically.
- New guard: copy the `PlaylistOwnerGuard` pattern, then `@UseGuards(NewGuard)`.
- New validated field: add it to the DTO with `class-validator` decorators, and add a column + migration if it's persisted.
- Timing/response interceptor: implement `NestInterceptor` and register it via `@UseInterceptors` or `APP_INTERCEPTOR`.

## Tier 2 — software engineering

| Goal | Evidence |
| --- | --- |
| Version control | Git with conventional commits, feature branches (`feat/*`, `test/*`, `ci/*`, `docs/*`) merged with `--no-ff`. Nothing was committed straight to `main` after the initial docs. |
| Reproducibility | `docker compose up --build` starts Postgres, Redis and the API, migrates and seeds demo data. Seed script: `app/prisma/seed.ts`. Test accounts are in the [README](../README.md). |
| Secrets | Env vars validated at boot. `.env` is git-ignored. Only dev defaults are committed. |
| Testing | 36 unit, 19 e2e, 7 system tests (see [architecture § Testing](architecture-and-teck-stack.md#testing-strategy)) |
| CI | `.github/workflows/ci-cd.yml`: lint, build, unit, e2e, system on every push. Image published on `main`. |
| Security | argon2id, hashed refresh tokens with reuse detection, Prisma parameterised queries, whitelist validation, helmet, CORS allow-list, rate limits, non-root container |
| Docs | README that actually runs, Swagger generated from code (`/docs`, `/docs-json`), this `docs/` folder |
| AI disclosure | [README § AI Disclosure](../README.md#ai-disclosure) |

## Tier 3 — optional, with evidence

| Item | Evidence |
| --- | --- |
| Redis cache + TTL + invalidation | `X-Cache` header. The e2e test "MISS → HIT → admin write invalidates → MISS" proves it. Measured locally on the Docker stack (`curl -w '%{time_total}'`, `GET /api/tracks?limit=9x`, 60 tracks with joins): **miss ≈ 7.4–9.2 ms** (51 ms on the very first cold call), **hit ≈ 2.0–3.3 ms**, so about 3× faster. The DB is tiny, so the gap would grow with real data. |
| DB indexes | `Track(playCount DESC)` for top charts, FK indexes, `(playlistId, position)`. See [rdm-spec § Indexes](rdm-spec.md#indexes). |
| Observability (partial) | Structured JSON logs, `X-Request-Id` propagation, `/api/health` (DB + Redis). No metrics (Prometheus dropped). |
| Redis-backed rate limiting | Shared across instances. The e2e test shows per-user isolation. |
