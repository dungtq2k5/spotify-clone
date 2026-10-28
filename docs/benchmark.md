# Đo hiệu năng cache Redis

## Mục tiêu

Trả lời câu hỏi: cache có thực sự giảm độ trễ cho các API catalog đọc nhiều hay không, và giảm bao nhiêu?

## Môi trường đo

| Thành phần | Giá trị |
| --- | --- |
| Máy đo | Windows 11, Ryzen 7 5800H, 16 GB RAM |
| Stack | `docker compose up --build` (Postgres 17, Redis 8, API NestJS 11) |
| Endpoint | `GET /api/tracks?limit=50` (60 track, join artist + album) |
| Dữ liệu | Seed mock: 6 nghệ sĩ, 12 album, 60 track |
| Công cụ | `scripts/bench-cache.sh` (curl, 30 lượt mỗi trạng thái) |
| Ngày đo | 2026-10-20 |

## Cách đo

```bash
BASE_URL=http://localhost:3000 ROUNDS=30 ./scripts/bench-cache.sh
```

Script gọi một lần để làm nóng kết nối, sau đó đo 30 lượt MISS (cache vừa bị xoá), rồi 30 lượt HIT. Lượt gọi đầu tiên sau khi container khởi động bị loại khỏi bảng vì bao gồm thời gian warm-up của JIT và connection pool.

## Kết quả

| Trạng thái | Trung bình | P95 | Nhỏ nhất | Lớn nhất |
| --- | ---: | ---: | ---: | ---: |
| MISS (PostgreSQL) | 8,3 ms | 10,1 ms | 7,4 ms | 10,8 ms |
| HIT (Redis) | 2,4 ms | 3,1 ms | 2,0 ms | 3,3 ms |

- Tỉ lệ cải thiện trung bình: **8,3 / 2,4 ≈ 3,5 lần**.
- Lượt gọi nguội đầu tiên: 51 ms (không tính vào bảng).
- Dữ liệu nhỏ nên chênh lệch chủ yếu đến từ việc bỏ round-trip PostgreSQL và các phép join; với dữ liệu lớn hơn, khoảng cách sẽ rộng hơn.

## Kiểm chứng cache hoạt động

```bash
curl -s -D- 'http://localhost:3000/api/tracks?limit=50' -o /dev/null | grep -i x-cache
# X-Cache: MISS

curl -s -D- 'http://localhost:3000/api/tracks?limit=50' -o /dev/null | grep -i x-cache
# X-Cache: HIT
```

Sau khi admin `POST/PATCH/DELETE` một track, request GET kế tiếp trả `MISS` trở lại.

## Lưu ý

- TTL 30 giây; `/tracks/top` chấp nhận dữ liệu trễ tối đa 30 giây.
- Invalidation hiện tại là `cache.clear()` trong namespace `cache`, không đụng tới key rate-limit.
- Không cache route phụ thuộc người dùng (`/playlists`, `/me/likes`) để tránh rò rỉ dữ liệu.
