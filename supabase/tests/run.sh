#!/usr/bin/env bash
# Thử mọi migration và bộ kiểm tra quyền trên một Postgres trống (không cần Supabase).
# Cách dùng: supabase/tests/run.sh <ten_db_trong>   (db sẽ bị xoá và tạo lại)
set -euo pipefail
DB=${1:?Cần tên database trống}
cd "$(dirname "$0")/.."
dropdb --if-exists "$DB"; createdb "$DB"
args=(-f tests/00_stub_supabase.sql)
for m in migrations/*.sql; do args+=(-f "$m"); done   # chạy mọi migration theo thứ tự tên
psql -q -d "$DB" -v ON_ERROR_STOP=1 "${args[@]}"
tests_args=(); for t in tests/[1-9]*.sql; do tests_args+=(-f "$t"); done
out=$(psql -q -d "$DB" "${tests_args[@]}" 2>&1)
echo "$out"
got=$(grep -c 'ERROR' <<<"$out" || true)
want=$(cat tests/[1-9]*.sql | grep -c "^\\\\echo .*PHẢI LỖI")
echo "Lỗi mong đợi: $want · lỗi thực tế: $got"
[ "$got" -eq "$want" ]
