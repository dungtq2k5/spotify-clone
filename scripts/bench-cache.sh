#!/usr/bin/env bash
# Đo thời gian phản hồi của một endpoint catalog trước/sau khi cache nóng.
# Yêu cầu: curl, awk. Stack đang chạy (docker compose up --build).
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
ENDPOINT="${ENDPOINT:-/api/tracks?limit=50}"
ROUNDS="${ROUNDS:-20}"
OUT_DIR="${OUT_DIR:-.bench}"

mkdir -p "$OUT_DIR"

measure() {
  local label="$1"
  local file="$OUT_DIR/${label}.txt"
  : > "$file"
  for _ in $(seq 1 "$ROUNDS"); do
    curl -s -o /dev/null -w '%{time_total}\n' "${BASE_URL}${ENDPOINT}" >> "$file"
  done
  awk -v label="$label" '
    { sum += $1; if (NR == 1 || $1 < min) min = $1; if ($1 > max) max = $1 }
    END { printf "%-6s n=%d  avg=%.2f ms  min=%.2f ms  max=%.2f ms\n",
                 label, NR, sum/NR*1000, min*1000, max*1000 }
  ' "$file"
}

echo "Endpoint: ${BASE_URL}${ENDPOINT} (${ROUNDS} lần mỗi lượt)"
curl -s -D "$OUT_DIR/headers-miss.txt" -o /dev/null "${BASE_URL}${ENDPOINT}"
measure "miss"
curl -s -D "$OUT_DIR/headers-hit.txt" -o /dev/null "${BASE_URL}${ENDPOINT}"
measure "hit"

echo
echo "X-Cache lần đầu:  $(grep -i '^x-cache' "$OUT_DIR/headers-miss.txt" | tr -d '\r')"
echo "X-Cache lần sau: $(grep -i '^x-cache' "$OUT_DIR/headers-hit.txt" | tr -d '\r')"
echo "Xem thêm: $OUT_DIR/"
