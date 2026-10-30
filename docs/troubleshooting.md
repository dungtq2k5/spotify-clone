# Lỗi thường gặp khi chạy dự án

## Cổng 3000/5440/6390 đang bị chiếm

```bash
# Windows
netstat -ano | findstr :3000
# Linux/macOS
lsof -i :3000
```

Đổi cổng host mà không sửa code:

```bash
APP_HOST_PORT=3001 POSTGRES_HOST_PORT=5441 REDIS_HOST_PORT=6391 docker compose up --build
```

## Prisma báo thiếu generated client

```bash
cd app
pnpm install       # postinstall chạy prisma generate
pnpm db:deploy
```

Nếu vừa đổi `schema.prisma`:

```bash
pnpm db:migrate --name <ten_migration>
```

## `Invalid environment` khi khởi động

Ứng dụng cố tình fail-fast. Kiểm tra `.env` có đủ:

```dotenv
DATABASE_URL=postgresql://spotify:spotify@localhost:5440/spotify
REDIS_URL=redis://localhost:6390
JWT_ACCESS_SECRET=<chuỗi tối thiểu 32 ký tự>
```

## Swagger UI trắng trang khi chạy HTTP

Helmet mặc định bật `upgrade-insecure-requests`, khiến trình duyệt đổi asset sang HTTPS. Dự án đã tắt directive này trong `app/src/app.setup.ts`. Nếu bật lại CSP, phải thêm ngoại lệ cho `/docs`.

## Refresh token trả 401 dù còn hạn

Refresh token chỉ dùng một lần. Nếu đã gọi `/auth/refresh`, token cũ bị thu hồi; dùng token mới trong response. Gửi lại token cũ bị coi là tái sử dụng và thu hồi toàn bộ phiên.

## `429 Too Many Requests`

Rate limit mặc định 100 request/phút mỗi user/IP; auth 10/phút; ghi nhận lượt nghe 30/phút. Chờ hết cửa sổ hoặc xoá key throttle trong Redis khi test:

```bash
docker compose exec redis redis-cli --scan --pattern 'throttle:*' | xargs -r docker compose exec -T redis redis-cli del
```

Không xoá cả Redis bằng `FLUSHALL` vì sẽ mất cache và bộ đếm của mọi instance.
