"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getBrowserClient } from "@/lib/supabase/client";
import { passwordLoginError } from "@/lib/auth-messages";
import { safeNext } from "@/lib/nav";

// Đăng nhập tạm bằng email + mật khẩu cho nhân viên, dùng trong lúc chưa bật Google.
// Không có đăng ký: tài khoản do quản trị tạo trong Supabase › Authentication › Users.
export function PasswordLogin({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await getBrowserClient().auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setBusy(false);
      setError(passwordLoginError(error.code, error.message));
      return;
    }
    router.replace(safeNext(next));
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5" noValidate>
      <div>
        <h2 className="text-[17px] font-bold">Nhân viên: đăng nhập bằng email</h2>
        <p className="mt-1 text-sm text-muted">Dùng email và mật khẩu quản trị đã cấp.</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-semibold">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          placeholder="ten@aiedu.com.vn"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-11 rounded-lg border border-edge bg-surface px-3 text-[15px] text-ink"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="mat-khau" className="text-sm font-semibold">
          Mật khẩu
        </label>
        <input
          id="mat-khau"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-11 rounded-lg border border-edge bg-surface px-3 text-[15px] text-ink"
        />
      </div>
      {error && (
        <p role="alert" className="rounded-lg bg-err-soft px-4 py-3 text-sm text-err">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy || !email || !password}
        className="flex min-h-11 cursor-pointer items-center justify-center rounded-[10px] border border-accent bg-surface px-5 text-[15px] font-semibold text-accent hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Đang đăng nhập…" : "Đăng nhập"}
      </button>
    </form>
  );
}
