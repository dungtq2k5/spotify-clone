# Dàn ý slide thuyết trình (7 slide)

## Slide 1 — Giới thiệu

- Nhóm 23 — Các Công nghệ Lập trình Hiện đại.
- Đề tài: Tìm hiểu và xây dựng dịch vụ Backend với công nghệ NestJS — Spotify Clone API.
- Thành viên và phân công ngắn gọn.

## Slide 2 — Bài toán và phạm vi

- Người dùng: khách, USER, ADMIN.
- Chức năng: catalog, playlist, like, ghi nhận lượt nghe, quản trị.
- Phạm vi: backend API, không có frontend; Swagger là client demo.
- Vì sao bài toán nhỏ: để cơ chế NestJS hiện rõ, không bị nghiệp vụ lấn át.

## Slide 3 — Kiến trúc

- Sơ đồ module: AppModule → 8 feature module + 3 module hạ tầng.
- Request lifecycle: Middleware → Guard → Interceptor → Pipe → Controller → Service → Prisma/Redis.
- DI singleton, PrismaService @Global, dynamic module cho Config/Cache/Throttler/JWT.

## Slide 4 — Bảng phủ kỹ thuật

- Tầng 1A: Module, Controller, Provider/DI, luồng controller → service → data source.
- Tầng 1B: DTO/ValidationPipe, Guard, Interceptor, Filter, Custom Decorator, Dynamic Module, Prisma transaction.
- Tầng 3: Redis cache + đo latency, rate limit trên Redis, observability (request id, health).
- Mỗi dòng ghi file và commit minh chứng.

## Slide 5 — Demo nhanh

- `docker compose up --build`.
- Swagger `/docs`: login → gọi catalog → tạo playlist → like → xem `X-Cache`.
- Chứng minh 401/403/404/409/429 bằng các request mẫu.

## Slide 6 — Kết quả và số liệu

- 37 endpoint, 30 unit + 19 e2e + 7 system test.
- Cache: 8,3 ms → 2,4 ms (khoảng 3,5 lần).
- CI xanh; image publish lên GHCR; một lệnh chạy toàn stack.

## Slide 7 — Bài học và hướng phát triển

- Guard vs Interceptor; vì sao chọn DI constructor.
- Bài học từ 3 lỗi: reorder 404, Prisma + Jest ESM, Helmet CSP.
- Hướng phát triển: tag-based cache, BullMQ, observability đầy đủ, WebSocket.
