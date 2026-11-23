"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CertificatePreview } from "@/components/cert/CertificatePreview";
import { Icon } from "@/components/Icon";
import { certMeta, cleanName, nameProblem, viDate, type Certificate } from "@/lib/certificate";
import { getBrowserClient } from "@/lib/supabase/client";
import { btnPrimaryLg, btnSecondary } from "@/lib/ui";

type Props = {
  courseId: string;
  slug: string;
  defaultName: string;
  origin: string;
  signer: { name: string; title: string };
  courseTitle: string;
  meta: string;
  cert: Certificate | null;
};

const box = "flex flex-wrap items-start gap-8 rounded-xl border border-line bg-surface p-7";

export function IssueCertificate(p: Props) {
  return p.cert ? <Issued {...p} cert={p.cert} /> : <Confirm {...p} />;
}

function Confirm(p: Props) {
  const router = useRouter();
  const [name, setName] = useState(p.defaultName);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function issue(e: React.FormEvent) {
    e.preventDefault();
    const problem = nameProblem(name);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError("");
    const { error: err } = await getBrowserClient().rpc("issue_certificate", { p_course: p.courseId, p_full_name: cleanName(name) });
    if (err) {
      setBusy(false);
      setError(`Chưa cấp được giấy chứng nhận: ${err.message}`);
      return;
    }
    router.refresh();
  }

  return (
    <section aria-labelledby="xac-nhan-ten" className={box}>
      <form onSubmit={issue} noValidate className="flex min-w-0 flex-[999_1_420px] flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <h2 id="xac-nhan-ten" className="text-xl font-bold">
            Nhận giấy chứng nhận
          </h2>
          <p className="text-[15px] leading-relaxed text-muted">
            Kiểm tra họ tên sẽ in trên giấy. Họ tên lấy từ tài khoản Google, nên có thể thiếu dấu hoặc sai thứ tự.
          </p>
        </div>
        <div className="flex max-w-[520px] flex-col gap-2">
          <label htmlFor="ho-ten" className="text-[15px] font-semibold">
            Họ và tên in trên giấy chứng nhận
          </label>
          <input
            id="ho-ten"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            maxLength={80}
            aria-describedby="ho-ten-goi-y"
            aria-invalid={error ? true : undefined}
            className="h-12 w-full rounded-lg border border-edge bg-surface px-3.5 text-lg font-semibold text-ink"
          />
          <p id="ho-ten-goi-y" className="text-sm leading-relaxed text-muted">
            Viết đủ dấu, họ trước tên sau, ví dụ “Nguyễn Thị Lan”. Sau khi cấp, họ tên trên giấy không đổi được; cần sửa thì liên hệ AI Edu.
          </p>
          {error && (
            <p role="alert" className="rounded-lg bg-err-soft px-3 py-2.5 text-sm text-err">
              {error}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={busy} className={btnPrimaryLg}>
            {busy ? "Đang cấp…" : "Cấp giấy chứng nhận"}
          </button>
        </div>
      </form>
      <div className="flex flex-[1_1_320px] flex-col gap-2.5">
        <span className="text-[13px] font-semibold text-muted">Xem trước</span>
        <CertificatePreview
          label="Xem trước giấy chứng nhận với họ tên bạn vừa nhập"
          data={{ fullName: cleanName(name), courseTitle: p.courseTitle, meta: p.meta, signerName: p.signer.name, signerTitle: p.signer.title }}
        />
      </div>
    </section>
  );
}

function Issued(p: Props & { cert: Certificate }) {
  const c = p.cert;
  const verifyUrl = `${p.origin}/chung-nhan/${c.code}`;
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(verifyUrl);
      setCopied(true);
    } catch {
      window.prompt("Sao chép link xác minh:", verifyUrl);
    }
  }
  return (
    <section aria-labelledby="da-cap" className={box}>
      <div className="flex flex-[1_1_360px] flex-col">
        <CertificatePreview
          label={`Giấy chứng nhận của ${c.full_name}, khoá ${c.course_title}`}
          data={{ fullName: c.full_name, courseTitle: c.course_title, meta: certMeta(c), code: c.code, verifyUrl, signerName: p.signer.name, signerTitle: p.signer.title }}
        />
      </div>
      <div className="flex min-w-0 flex-[999_1_380px] flex-col gap-5">
        <h2 id="da-cap" className="text-xl font-bold">
          Giấy chứng nhận đã sẵn sàng
        </h2>
        <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-5 gap-y-2.5 text-[15px]">
          <dt className="text-muted">Họ và tên</dt>
          <dd className="font-semibold">{c.full_name}</dd>
          <dt className="text-muted">Mã chứng nhận</dt>
          <dd className="font-semibold tracking-wide whitespace-nowrap">{c.code}</dd>
          <dt className="text-muted">Ngày cấp</dt>
          <dd className="font-semibold">{viDate(c.issued_at)}</dd>
        </dl>
        <div className="flex flex-wrap gap-3">
          <a href={`/chung-nhan/${c.code}/pdf`} className={`${btnPrimaryLg} gap-2`}>
            <Icon d="M12 4v11M7 10l5 5 5-5M5 20h14" size={18} stroke="#FFFFFF" width={2} />
            Tải giấy chứng nhận (PDF)
          </a>
          <a href={`/chung-nhan/${c.code}`} className={`${btnSecondary} min-h-12 text-[15px]`}>
            Mở trang xác minh
          </a>
          <button type="button" onClick={copy} className={`${btnSecondary} min-h-12 text-[15px]`}>
            {copied ? "Đã sao chép link" : "Sao chép link xác minh"}
          </button>
        </div>
        <p role="status" className="sr-only">
          {copied ? "Đã sao chép link xác minh." : ""}
        </p>
        <p className="text-sm leading-relaxed text-muted">
          Nhà trường hoặc đơn vị quét mã QR trên giấy, hoặc mở link xác minh, để kiểm tra giấy chứng nhận là thật. Bạn xem lại giấy này bất cứ lúc
          nào ở Khoá học của tôi › Đã hoàn thành.
        </p>
      </div>
    </section>
  );
}
