# Quy ước làm việc nhóm 23

## Nhánh

| Nhánh | Mục đích |
| --- | --- |
| `main` | Nhánh ổn định, chỉ nhận merge từ pull request đã review |
| `feat/<scope>` | Tính năng mới (ví dụ `feat/auth`, `feat/catalog`) |
| `fix/<scope>` | Sửa lỗi (ví dụ `fix/cache-namespace`) |
| `test/<scope>` | Bổ sung hoặc sửa kiểm thử |
| `docs/<scope>` | Tài liệu, README, sơ đồ |
| `ci/<scope>` | Pipeline, Docker, hạ tầng |

- Không commit trực tiếp vào `main` sau commit khởi tạo.
- Mỗi nhánh được merge bằng `--no-ff` để giữ lịch sử và commit merge.
- Trước khi mở pull request: `pnpm lint && pnpm test && pnpm build`.

## Commit message

Theo Conventional Commits:

```text
<type>(<scope>): <mô tả ngắn ở thể mệnh lệnh>

<body nếu cần>
```

Các `type` dùng trong dự án: `feat`, `fix`, `test`, `docs`, `build`, `ci`, `chore`, `refactor`, `perf`.

Ví dụ:

```text
feat(auth): rotate refresh tokens and detect reuse
fix(cache): scope invalidation to cache namespace
test(playlists): cover private playlist visibility
```

## Review chéo

- Mỗi pull request cần ít nhất một thành viên khác đọc diff và chạy thử.
- Người review ghi rõ: đã chạy lệnh gì, kết quả nào, còn câu hỏi nào.
- Không merge khi còn conflict hoặc khi pipeline đỏ.

## Định dạng mã nguồn

- TypeScript strict, ESLint + Prettier.
- DTO dùng `class-validator`; không đặt logic nghiệp vụ trong controller.
- Mọi thay đổi schema Prisma phải kèm migration.
- Không commit `.env`, token, mật khẩu thật. Chỉ commit `.env.example` và `.env.test`.
