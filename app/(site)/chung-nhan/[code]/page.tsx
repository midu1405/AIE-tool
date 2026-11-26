import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CertificatePreview } from "@/components/cert/CertificatePreview";
import { CodeLookup } from "@/components/cert/CodeLookup";
import { Icon } from "@/components/Icon";
import { hoursText } from "@/lib/catalog";
import { certMeta, normalizeCode, viDate, type Certificate } from "@/lib/certificate";
import { certSigner } from "@/lib/certificate-pdf";
import { siteOrigin } from "@/lib/site-url";
import { createPublicClient } from "@/lib/supabase/public";

// Trang xác minh công khai (design/artboards/XacMinh.dc.html). Hiện họ tên, khoá, thời lượng, ngày; không hiện email.
export const metadata = { title: "Xác minh giấy chứng nhận", robots: { index: false } };

export default function VerifyPage({ params }: PageProps<"/chung-nhan/[code]">) {
  return (
    <main className="mx-auto flex w-full max-w-[960px] flex-col gap-6 px-6 pt-10 pb-14">
      <div className="flex flex-col gap-2">
        <h1 className="text-[32px] leading-tight font-bold">Xác minh giấy chứng nhận</h1>
        <p className="text-base leading-relaxed text-muted">Kiểm tra giấy chứng nhận hoàn thành khoá học do AI Edu cấp.</p>
      </div>
      <Suspense fallback={<p className="text-muted">Đang kiểm tra mã…</p>}>
        <Result params={params} />
      </Suspense>
      <CodeLookup label="Kiểm tra mã khác" />
      <p className="text-sm leading-relaxed text-muted">
        Trang này công khai để nhà trường và đơn vị kiểm tra giấy chứng nhận. Chỉ hiện họ tên, khoá học và ngày hoàn thành; không hiện email
        hay kết quả học. Xem thêm ở <Link href="/quyen-rieng-tu">Quyền riêng tư</Link>.
      </p>
    </main>
  );
}

const card = "flex flex-col gap-4 rounded-xl border border-line bg-surface p-7";

async function Result({ params }: { params: Promise<{ code: string }> }) {
  const raw = (await params).code;
  const code = normalizeCode(raw);
  if (!code) notFound();
  const { data, error } = await createPublicClient().rpc("verify_certificate", { p_code: code });
  if (error)
    return (
      <section className={card}>
        <p role="alert" className="text-err">
          Chưa kiểm tra được mã {code}: {error.message}. Tải lại trang sau ít phút.
        </p>
      </section>
    );
  const cert = (data as Certificate[] | null)?.[0];
  if (!cert)
    return (
      <section aria-labelledby="khong-thay" className={card}>
        <h2 id="khong-thay" className="text-xl font-bold">
          Không tìm thấy giấy chứng nhận có mã {code}
        </h2>
        <p className="text-base leading-relaxed text-muted">
          Kiểm tra lại mã in ở góc dưới bên trái giấy chứng nhận (dạng AIE-2026-XXXX-XXXX-XX), rồi nhập lại bên dưới.
        </p>
      </section>
    );
  if (cert.revoked_at)
    return (
      <section aria-labelledby="thu-hoi" className={card}>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-[#FCECE3] px-3.5 py-1.5 text-[15px] font-bold text-[#A3470F]">Đã thu hồi</span>
          <h2 id="thu-hoi" className="text-xl font-bold">
            Giấy chứng nhận này không còn hiệu lực
          </h2>
        </div>
        <p className="text-base leading-relaxed text-muted">
          Mã {cert.code} đã bị AI Edu thu hồi ngày {viDate(cert.revoked_at)}. Cần biết thêm, hãy liên hệ AI Edu qua trang{" "}
          <Link href="/tro-giup">Trợ giúp</Link>.
        </p>
      </section>
    );

  const origin = await siteOrigin();
  const signer = certSigner();
  const rows: [string, React.ReactNode][] = [
    ["Họ và tên", <strong key="n">{cert.full_name}</strong>],
    [
      "Khoá học",
      <Link key="c" href={`/khoa-hoc/${cert.course_slug}`} className="font-semibold no-underline">
        {cert.course_title}
      </Link>,
    ],
    ["Thời lượng", `${hoursText(Number(cert.hours_min), Number(cert.hours_max))} · ${cert.module_count} học phần`],
    ["Ngày hoàn thành", viDate(cert.completed_at)],
    ["Mã chứng nhận", <span key="m" className="font-semibold tracking-wide whitespace-nowrap">{cert.code}</span>],
  ];
  return (
    <section aria-labelledby="ket-qua" className={`${card} gap-6`}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-ok-soft px-3.5 py-1.5 text-[15px] font-bold text-ok">
          <Icon d="M5 12.5l4.2 4.2L19 7" size={18} stroke="currentColor" width={2.4} />
          Hợp lệ
        </span>
        <h2 id="ket-qua" className="text-xl font-bold">
          Giấy chứng nhận này do AI Edu cấp
        </h2>
      </div>
      <div className="flex flex-wrap items-start gap-8">
        <dl className="grid min-w-0 flex-[999_1_340px] grid-cols-[max-content_minmax(0,1fr)] gap-x-6 gap-y-3.5 text-base">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-[1_1_300px] flex-col gap-3">
          <CertificatePreview
            label={`Giấy chứng nhận của ${cert.full_name}, khoá ${cert.course_title}`}
            data={{
              fullName: cert.full_name,
              courseTitle: cert.course_title,
              meta: certMeta(cert),
              code: cert.code,
              verifyUrl: `${origin}/chung-nhan/${cert.code}`,
              signerName: signer.name,
              signerTitle: signer.title,
            }}
          />
          <a
            href={`/chung-nhan/${cert.code}/pdf`}
            className="inline-flex min-h-11 items-center self-start rounded-[10px] border border-edge bg-surface px-4 text-[15px] font-semibold text-ink no-underline hover:bg-bg"
          >
            Tải bản PDF
          </a>
        </div>
      </div>
    </section>
  );
}
