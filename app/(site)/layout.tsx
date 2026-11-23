import Link from "next/link";
import { Suspense } from "react";
import { BrandLogo, PartnerLogo } from "@/components/Brand";
import { SiteNav, SiteNavStatic } from "@/components/SiteNav";
import { UserArea, UserAreaFallback } from "@/components/UserArea";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-3">
          <Link href="/" aria-label="AI Edu Training Hub – trang chủ" className="flex items-center gap-3 text-ink no-underline hover:text-ink">
            <BrandLogo height={40} />
            <span aria-hidden="true" className="h-7 w-px bg-line" />
            <span className="text-lg font-medium text-muted">Training Hub</span>
          </Link>
          <Suspense fallback={<SiteNavStatic />}>
            <SiteNav />
          </Suspense>
          <Suspense fallback={<UserAreaFallback />}>
            <UserArea />
          </Suspense>
        </div>
      </header>

      <div className="flex-1">{children}</div>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-x-8 gap-y-4 p-6 text-sm text-muted">
          <div className="flex flex-col gap-3">
            <PartnerLogo height={32} />
            <span>AI Edu Training Hub</span>
          </div>
          <nav aria-label="Liên kết cuối trang" className="flex flex-wrap gap-x-5">
            <Link href="/tro-giup" className="flex min-h-11 items-center text-muted">
              Trợ giúp
            </Link>
            <Link href="/dieu-khoan" className="flex min-h-11 items-center text-muted">
              Điều khoản
            </Link>
            <Link href="/quyen-rieng-tu" className="flex min-h-11 items-center text-muted">
              Quyền riêng tư
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
