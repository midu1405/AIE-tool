import { Icon } from "@/components/Icon";
import { SUPPORT_EMAIL } from "@/lib/env";

// Khung chung cho các trang thông tin: Trợ giúp, Quyền riêng tư, Điều khoản.
export function InfoPage({ title, lead, draft, updated, children }: { title: string; lead: string; draft?: boolean; updated: string; children: React.ReactNode }) {
  return (
    <>
      <section className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-[860px] flex-col gap-3 px-6 pt-10 pb-8">
          <h1 className="text-[32px] leading-tight font-bold sm:text-[38px]">{title}</h1>
          <p className="text-[17px] leading-relaxed text-muted">{lead}</p>
          <p className="text-sm text-muted">Cập nhật {updated}</p>
        </div>
      </section>
      <main className="mx-auto flex max-w-[860px] flex-col gap-6 px-6 pt-8 pb-14">
        {draft && (
          <p role="note" className="flex gap-3 rounded-[10px] bg-warn-soft px-4 py-3.5 text-[15px] leading-relaxed text-warn">
            <Icon d="M12 7v6M12 17h.01" size={20} stroke="#7A4B00" width={2.4} className="mt-0.5 flex-none" />
            Bản nháp, đang chờ bộ phận pháp chế và người phụ trách dữ liệu của AI Edu duyệt. Nội dung có thể thay đổi trước khi web mở cho giáo
            viên.
          </p>
        )}
        <article className="flex flex-col gap-7 rounded-xl border border-line bg-surface p-6 text-[15px] leading-[1.7] sm:p-8 [&_h2]:text-xl [&_h2]:font-bold [&_li]:mt-1 [&_ul]:list-disc [&_ul]:pl-5">
          {children}
        </article>
      </main>
    </>
  );
}

/** Email hỗ trợ (từ biến môi trường). Chưa đặt thì nói rõ là đang chờ, không bịa địa chỉ. */
export function SupportContact() {
  return SUPPORT_EMAIL ? (
    <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
  ) : (
    <span>hộp thư hỗ trợ của AI Edu (địa chỉ sẽ được cập nhật trước khi web mở cho giáo viên)</span>
  );
}
