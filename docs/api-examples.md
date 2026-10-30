# Ví dụ gọi API

Base URL: `http://localhost:3000/api`. Tài khoản demo xem [README](../README.md#demo-accounts).

## 1. Đăng nhập và lấy token

```bash
curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@spotify.local","password":"Admin123!"}'
```

Kết quả rút gọn:

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "0d9f... .c2VjcmV0",
  "expiresIn": 900,
  "user": { "id": "...", "email": "admin@spotify.local", "role": "ADMIN" }
}
```

Lưu token vào biến:

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@spotify.local","password":"Admin123!"}' | jq -r .accessToken)
```

## 2. Duyệt catalog (công khai, có cache)

```bash
curl -s 'http://localhost:3000/api/tracks?page=1&limit=5&q=midnight'
curl -s 'http://localhost:3000/api/tracks/top?limit=10'
curl -s -D- 'http://localhost:3000/api/artists?limit=3' -o /dev/null | grep -i x-cache
```

## 3. Gọi route bảo vệ

```bash
curl -s http://localhost:3000/api/users/me \
  -H "Authorization: Bearer $TOKEN"
```

## 4. Tạo playlist và thêm bài

```bash
PLAYLIST=$(curl -s -X POST http://localhost:3000/api/playlists \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Demo","isPublic":true}' | jq -r .id)

TRACK=$(curl -s 'http://localhost:3000/api/tracks?limit=1' | jq -r '.data[0].id')

curl -s -X POST "http://localhost:3000/api/playlists/$PLAYLIST/tracks" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"trackId\":\"$TRACK\"}"
```

## 5. Like và ghi nhận lượt nghe

```bash
curl -s -X PUT "http://localhost:3000/api/tracks/$TRACK/like" \
  -H "Authorization: Bearer $TOKEN" -o /dev/null -w '%{http_code}\n'

curl -s -X POST "http://localhost:3000/api/tracks/$TRACK/play" \
  -H "Authorization: Bearer $TOKEN"
```

## 6. Refresh token

```bash
REFRESH=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@spotify.local","password":"User123!"}' | jq -r .refreshToken)

curl -s -X POST http://localhost:3000/api/auth/refresh \
  -H 'Content-Type: application/json' \
  -d "{\"refreshToken\":\"$REFRESH\"}"
```

Gọi lại đúng refresh token cũ lần thứ hai sẽ nhận `401` và toàn bộ phiên của user bị thu hồi.
