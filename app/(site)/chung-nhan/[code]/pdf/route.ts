import { certFileName, normalizeCode, type Certificate } from "@/lib/certificate";
import { renderCertificatePdf } from "@/lib/certificate-pdf";
import { createPublicClient } from "@/lib/supabase/public";

// Tải PDF giấy chứng nhận theo mã. Công khai như trang xác minh (mã in trên giấy). Giấy đã thu hồi thì không tải được.
export async function GET(request: Request, ctx: RouteContext<"/chung-nhan/[code]/pdf">) {
  const code = normalizeCode((await ctx.params).code);
  const text = (msg: string, status: number) => new Response(msg, { status, headers: { "content-type": "text/plain; charset=utf-8" } });
  if (!code) return text("Mã giấy chứng nhận không đúng dạng (AIE-2026-XXXX-XXXX-XX).", 404);

  const { data, error } = await createPublicClient().rpc("verify_certificate", { p_code: code });
  if (error) return text("Chưa tải được giấy chứng nhận. Thử lại sau ít phút.", 502);
  const cert = (data as Certificate[] | null)?.[0];
  if (!cert) return text(`Không tìm thấy giấy chứng nhận có mã ${code}.`, 404);
  if (cert.revoked_at) return text(`Giấy chứng nhận ${code} đã bị thu hồi nên không tải được.`, 410);

  const verifyUrl = `${new URL(request.url).origin}/chung-nhan/${code}`;
  const bytes = await renderCertificatePdf(cert, verifyUrl);
  const name = certFileName(code);
  return new Response(Buffer.from(bytes), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${name}"`,
      "cache-control": "private, max-age=300",
    },
  });
}
