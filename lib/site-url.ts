import "server-only";
import { headers } from "next/headers";

/** Địa chỉ gốc của web theo request đang xử lý (dùng cho link xác minh in trên giấy). Gọi trong <Suspense>. */
export async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
