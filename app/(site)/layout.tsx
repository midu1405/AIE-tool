import Link from "next/link";
import { Suspense } from "react";
import { LogoMark } from "@/components/Icon";
import { SiteNav, SiteNavStatic } from "@/components/SiteNav";
import { UserArea, UserAreaFallback } from "@/components/UserArea";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-3">
          <Link href="/" className="flex items-center gap-2.5 text-ink no-underline hover:text-ink">
            <LogoMark />
            <span className="text-lg font-bold">
              AI Edu <span className="font-medium text-muted">Training Hub</span>
            </span>
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

      <footer id="tro-giup" className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-[1200px] flex-wrap justify-between gap-x-8 gap-y-4 p-6 text-sm text-muted">
          <span>AI Edu Training Hub</span>
          <nav aria-label="Liên kết cuối trang" className="flex flex-wrap gap-5">
            <a href="#tro-giup" className="text-muted">Trợ giúp</a>
            <a href="#tro-giup" className="text-muted">Điều khoản</a>
            <a href="#tro-giup" className="text-muted">Quyền riêng tư</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
