# Product Overview

A **simple Spotify-like music API**. The product is deliberately small: it exists to show what NestJS does well (see [course-requirements.md](course-requirements.md)), not to be a real streaming service.

## Roles

| Role | Who | Can |
| --- | --- | --- |
| Anonymous | Anyone | Browse/search artists, albums, tracks, top charts, public playlists; register, log in |
| `USER` | Registered listener | Everything anonymous can, plus: own profile, create/edit/delete **own** playlists, like tracks, record plays |
| `ADMIN` | Operator | Everything a user can, plus: manage the catalog (artists/albums/tracks), list users, change roles, moderate any playlist |

New accounts are always `USER`. The only admin comes from the seed (`pnpm db:seed`) or from another admin promoting a user.

## Features

| Area | Feature |
| --- | --- |
| Auth | Register, login, short-lived JWT access token (15 min), rotating refresh token (7 days), logout, reuse detection |
| Catalog | Artists → Albums → Tracks; paginated + searchable (`?q=`, `?page=`, `?limit=`), filters (`artistId`, `albumId`), top tracks by play count |
| Playlists | Public/private, ordered tracks, add / remove / reorder, only owner (or admin) can modify, private ones are invisible to others |
| Library | Like/unlike tracks (idempotent), list liked tracks, record a play (rate-limited per user) |
| Ops | Health check (DB + Redis), Swagger docs, structured logs with request id |

## Out of scope (by design)

- Real audio upload/streaming — tracks store an `audioUrl` only.
- WebSocket, queues (BullMQ), metrics (Prometheus) — dropped for time.
- Social features (follow, share), recommendations, payments.
- Frontend — Swagger UI (`/docs`) is the showcase client.

## Demo accounts (after seeding)

| Email | Password | Role |
| --- | --- | --- |
| `admin@spotify.local` | `Admin123!` | ADMIN |
| `user@spotify.local` | `User123!` | USER |
| `jane@spotify.local` | `Jane123!` | USER |

Mock data: 6 fictional artists, 12 albums, 60 tracks, 3 playlists (one private), likes.
