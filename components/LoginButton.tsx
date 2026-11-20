"use client";
import { useState } from "react";
import { getBrowserClient } from "@/lib/supabase/client";
import { safeNext } from "@/lib/nav";

export function LoginButton({ next }: { next: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function signIn() {
    setBusy(true);
    setError("");
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext(next))}`;
    const { error } = await getBrowserClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
    if (error) {
      setBusy(false);
      setError(
        error.message.includes("provider is not enabled")
          ? "Đăng nhập Google chưa được bật trên hệ thống. Báo quản trị bật Google trong Supabase › Authentication."
          : `Không mở được trang đăng nhập Google: ${error.message}`,
      );
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={signIn}
        disabled={busy}
        className="flex min-h-12 cursor-pointer items-center justify-center rounded-[10px] bg-accent px-5 text-[15px] font-semibold text-white hover:bg-accent-dark disabled:cursor-wait disabled:opacity-70"
      >
        {busy ? "Đang chuyển sang Google…" : "Đăng nhập bằng Google"}
      </button>
      {error && (
        <p role="alert" className="rounded-lg bg-err-soft px-4 py-3 text-sm text-err">
          {error}
        </p>
      )}
    </div>
  );
}
