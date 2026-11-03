#!/usr/bin/env bash
# Smoke test nhanh luồng chính: health → login → catalog → playlist → like.
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
EMAIL="${EMAIL:-user@spotify.local}"
PASSWORD="${PASSWORD:-User123!}"

pass() { printf '  [OK] %s\n' "$1"; }
fail() { printf '  [FAIL] %s\n' "$1" >&2; exit 1; }

echo "1. Health"
curl -fsS "$BASE_URL/api/health" >/dev/null && pass "GET /api/health"

echo "2. Login"
LOGIN=$(curl -fsS -X POST "$BASE_URL/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
TOKEN=$(printf '%s' "$LOGIN" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
[ -n "$TOKEN" ] && pass "POST /api/auth/login" || fail "không lấy được accessToken"

echo "3. Catalog"
curl -fsS "$BASE_URL/api/tracks?limit=3" >/dev/null && pass "GET /api/tracks"
curl -fsS "$BASE_URL/api/tracks/top?limit=3" >/dev/null && pass "GET /api/tracks/top"

echo "4. Playlist"
PLAYLIST=$(curl -fsS -X POST "$BASE_URL/api/playlists" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Smoke test","isPublic":true}' | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')
TRACK=$(curl -fsS "$BASE_URL/api/tracks?limit=1" | sed -n 's/.*"data":\[{"id":"\([^"]*\)".*/\1/p')
curl -fsS -X POST "$BASE_URL/api/playlists/$PLAYLIST/tracks" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"trackId\":\"$TRACK\"}" >/dev/null && pass "POST /api/playlists/:id/tracks"

echo "5. Library"
curl -fsS -X PUT "$BASE_URL/api/tracks/$TRACK/like" \
  -H "Authorization: Bearer $TOKEN" -o /dev/null && pass "PUT /api/tracks/:id/like"
curl -fsS "$BASE_URL/api/me/likes" \
  -H "Authorization: Bearer $TOKEN" >/dev/null && pass "GET /api/me/likes"

echo "Smoke test hoàn tất."
