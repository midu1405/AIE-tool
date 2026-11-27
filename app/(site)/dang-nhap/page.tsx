import { Suspense } from "react";
import { LoginButton } from "@/components/LoginButton";
import { PasswordLogin } from "@/components/PasswordLogin";

export const metadata = { title: "Đăng nhập" };

export default function LoginPage({ searchParams }: PageProps<"/dang-nhap">) {
  return (
    <main className="mx-auto flex max-w-[480px] flex-col gap-5 px-6 py-16">
      <h1 className="text-[30px] font-bold">Đăng nhập</h1>
      <p className="text-[15px] leading-relaxed text-muted">
        Dùng tài khoản Google để đăng ký khoá học và lưu tiến độ. Nhân viên AI Edu đăng nhập bằng email @aiedu.com.vn để vào khu nội bộ.
      </p>
      <Suspense fallback={<span className="block h-12 rounded-[10px] bg-line-soft" aria-hidden="true" />}>
        <LoginBody searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function LoginBody({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/";
  const error = typeof sp.loi === "string" ? sp.loi : "";
  return (
    <>
      {error && (
        <p role="alert" className="rounded-lg bg-err-soft px-4 py-3 text-sm text-err">
          {error === "chua-moi"
            ? "Email này chưa có trong danh sách dùng thử. Trong giai đoạn thử, chỉ tài khoản @aiedu.com.vn và email được AI Edu mời mới đăng nhập được. Nhờ người mời bạn thêm email này, rồi đăng nhập lại."
            : "Đăng nhập chưa thành công. Thử lại; nếu vẫn lỗi, báo quản trị kèm thời điểm thử."}
        </p>
      )}
      <LoginButton next={next} />
      <div className="flex items-center gap-3 text-sm text-muted" aria-hidden="true">
        <span className="h-px flex-1 bg-line" />
        hoặc
        <span className="h-px flex-1 bg-line" />
      </div>
      <PasswordLogin next={next} />
    </>
  );
}
