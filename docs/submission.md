# Hồ sơ nộp bài

## Thông tin nhóm

| | |
| --- | --- |
| Nhóm | 23 |
| Học phần | Các Công nghệ Lập trình Hiện đại |
| Đề tài | Tìm hiểu và xây dựng dịch vụ Backend với công nghệ NestJS — Hệ thống nghe nhạc Spotify Clone |
| Repo | <https://github.com/dungtq2k5/spotify-clone> |
| Commit niêm phong | tag `v1.0.0` (xem `git rev-parse v1.0.0`) |

## Checklist trước khi nộp

- [x] Báo cáo toàn văn theo cấu trúc học phần (PDF khi nộp).
- [x] Báo cáo tiến độ 12 tuần và nhật ký công việc.
- [x] Báo cáo cá nhân của 3 thành viên.
- [x] Hands-on lab 30–45 phút.
- [x] Mã nguồn + tag commit niêm phong.
- [x] Slide 5–7 slide và video demo 2–3 phút (nộp kèm).
- [x] Biên bản đánh giá đồ án cuối kỳ.

## Lệnh kiểm tra nhanh

```bash
git checkout v1.0.0
docker compose up --build
```

Sau khi stack lên:

```bash
curl -s http://localhost:3000/api/health
curl -s -D- http://localhost:3000/api/tracks?limit=3 | head -n 20
```

Swagger UI: <http://localhost:3000/docs>

## Tài khoản demo

| Email | Mật khẩu | Vai trò |
| --- | --- | --- |
| `admin@spotify.local` | `Admin123!` | ADMIN |
| `user@spotify.local` | `User123!` | USER |
| `jane@spotify.local` | `Jane123!` | USER |
