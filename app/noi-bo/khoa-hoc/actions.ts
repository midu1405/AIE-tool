"use server";
import { updateTag } from "next/cache";
import { getCurrentUser } from "@/lib/auth";

/** Gọi sau khi sửa / xuất bản / ẩn khoá để danh mục công khai (lưu đệm "use cache") hiện ngay bản mới. */
export async function refreshCatalog() {
  const user = await getCurrentUser();
  if (!user || user.roles.length === 0) return { ok: false };
  updateTag("courses");
  return { ok: true };
}
