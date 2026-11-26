import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CodeLookup } from "@/components/cert/CodeLookup";
import { normalizeCode } from "@/lib/certificate";

export const metadata = { title: "Xác minh giấy chứng nhận" };

// Nhập mã để xác minh (ô "Kiểm tra mã khác" gửi về đây bằng ?ma=). Mã đúng dạng thì chuyển tới /chung-nhan/<mã>.
export default function LookupPage({ searchParams }: PageProps<"/chung-nhan">) {
  return (
    <Suspense fallback={<Shell />}>
      <Body searchParams={searchParams} />
    </Suspense>
  );
}

async function Body({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = (await searchParams).ma;
  const typed = typeof raw === "string" ? raw : "";
  if (typed) {
    const code = normalizeCode(typed);
    if (code) redirect(`/chung-nhan/${code}`);
  }
  return <Shell typed={typed} />;
}

function Shell({ typed = "" }: { typed?: string }) {
  return (
    <main className="mx-auto flex w-full max-w-[960px] flex-col gap-6 px-6 pt-10 pb-14">
      <div className="flex flex-col gap-2">
        <h1 className="text-[32px] leading-tight font-bold">Xác minh giấy chứng nhận</h1>
        <p className="text-base leading-relaxed text-muted">Nhập mã in ở góc dưới bên trái giấy chứng nhận, hoặc quét mã QR trên giấy.</p>
      </div>
      <CodeLookup
        label="Mã giấy chứng nhận"
        defaultValue={typed}
        error={typed ? `“${typed}” không đúng dạng mã. Mã có dạng AIE-2026-XXXX-XXXX-XX (10 ký tự cuối gồm chữ và số; gõ thiếu gạch cũng được). Giấy cấp trước 26/11/2026 có 6 ký tự cuối.` : ""}
      />
    </main>
  );
}
