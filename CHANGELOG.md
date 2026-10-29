# Changelog

Định dạng theo [Keep a Changelog](https://keepachangelog.com/vi/1.1.0/) và [Semantic Versioning](https://semver.org/lang/vi/).

## [1.0.0] — 2026-11-04

### Thêm mới

- API Spotify Clone với 37 endpoint: auth, users, artists, albums, tracks, playlists, library, health.
- Xác thực JWT access token 15 phút, refresh token xoay vòng 7 ngày, phát hiện tái sử dụng và thu hồi toàn bộ phiên.
- Phân quyền RBAC (`USER`/`ADMIN`), kiểm tra quyền sở hữu playlist, playlist riêng tư trả 404 với người ngoài.
- Catalog có phân trang, tìm kiếm, lọc theo nghệ sĩ/album, bảng xếp hạng theo lượt nghe.
- Redis cache read-through cho catalog, TTL 30 giây, header `X-Cache`, invalidate khi admin ghi dữ liệu.
- Rate limiting lưu trên Redis: 100 req/phút mặc định, 10 req/phút cho auth, 30 req/phút cho ghi nhận lượt nghe.
- Prisma 7 + PostgreSQL 17, migration, seed dữ liệu demo tất định.
- Unit test (30), e2e test (19), system test (7), Swagger tại `/docs`, health check tại `/api/health`.
- Docker Compose 3 dịch vụ, Dockerfile multi-stage chạy bằng user không phải root.
- GitHub Actions: lint, build, unit, e2e, system test; publish image lên GHCR khi push `main`.

### Sửa lỗi

- Trả đúng playlist sau khi reorder mà không kiểm tra lại quyền hiển thị.
- Ánh xạ import `.js` của Prisma Client khi chạy Jest.
- Tắt `upgrade-insecure-requests` của Helmet để Swagger UI chạy được qua HTTP.

### Tài liệu

- README, kiến trúc, mô hình dữ liệu, checklist học phần, hướng dẫn nộp bài.
- Báo cáo nhóm, báo cáo cá nhân, báo cáo tiến độ, biên bản đánh giá và hands-on lab.

[1.0.0]: https://github.com/dungtq2k5/spotify-clone/releases/tag/v1.0.0
