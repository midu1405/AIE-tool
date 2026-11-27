import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loginErrorCode, safeNext } from "@/lib/nav";

// Google chuyển về đây kèm ?code=…; đổi code lấy phiên rồi về trang người dùng định vào. Supabase từ chối (vd. email chưa
// có trong danh sách dùng thử) thì về đây kèm ?error=…&error_description=… thay cho code.
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  const loi = loginErrorCode(url.searchParams.get("error_description"));
  return NextResponse.redirect(new URL(`/dang-nhap?loi=${loi}&next=${encodeURIComponent(next)}`, url.origin));
}
