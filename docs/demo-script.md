# Kịch bản video demo (2–3 phút)

## Chuẩn bị

```bash
docker compose up --build
```

Mở sẵn:

- Swagger: <http://localhost:3000/docs>
- Terminal tại thư mục repo

## 0:00–0:25 — Giới thiệu

- Nhóm 23, đề tài NestJS + Spotify Clone API.
- Kiến trúc: 8 feature module, PostgreSQL 17, Redis 8, Prisma 7.
- Chỉ vào sơ đồ module trong báo cáo.

## 0:25–0:50 — Một lệnh chạy hệ thống

```bash
docker compose ps
curl -s http://localhost:3000/api/health
```

- Nói: 3 container healthy, health check kiểm tra cả DB và Redis.

## 0:50–1:25 — Auth + RBAC

- Trong Swagger: `POST /api/auth/login` với `admin@spotify.local`.
- Copy `accessToken`, bấm Authorize.
- Gọi `POST /api/artists` thành công (201).
- Đăng nhập `user@spotify.local`, gọi lại `POST /api/artists` → 403.
- Gọi không token → 401.

## 1:25–1:55 — Cache

```bash
curl -s -D- 'http://localhost:3000/api/tracks?limit=50' -o /dev/null | grep -i x-cache
curl -s -D- 'http://localhost:3000/api/tracks?limit=50' -o /dev/null | grep -i x-cache
```

- Lần đầu `MISS`, lần sau `HIT`.
- Admin sửa một track, gọi lại → `MISS`.
- Nêu số liệu: 8,3 ms → 2,4 ms.

## 1:55–2:25 — Playlist transaction + ownership

- Tạo playlist riêng tư bằng `user`.
- Thêm 3 track, reorder, xem `position` liên tục 0..n-1.
- Đăng nhập `jane`, sửa playlist → 403; xem playlist riêng tư → 404.

## 2:25–2:50 — Kết thúc

- Mở terminal chạy `pnpm test` hoặc chỉ vào kết quả CI.
- Tóm tắt: 37 endpoint, 56 test, CI xanh, một lệnh Docker.
- Cảm ơn và mời đặt câu hỏi.
