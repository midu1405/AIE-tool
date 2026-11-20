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
out=$(psql -q -d "$DB" -f tests/10_courses_rules.sql 2>&1)
echo "$out"
got=$(grep -c 'ERROR' <<<"$out" || true)
want=$(grep -c "^\\\\echo .*PHẢI LỖI" tests/10_courses_rules.sql)
echo "Lỗi mong đợi: $want · lỗi thực tế: $got"
[ "$got" -eq "$want" ]
