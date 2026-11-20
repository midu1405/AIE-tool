"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CourseForm, EMPTY_COURSE } from "@/components/courses/CourseForm";
import { courseSaveError, formToRow } from "@/lib/course-admin";
import { getBrowserClient } from "@/lib/supabase/client";
import { btnPrimary, card } from "@/lib/ui";

// Nút "Tạo khoá học" mở form; khoá mới luôn ở trạng thái nháp.
export function NewCourse() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={btnPrimary}>
        Tạo khoá học
      </button>
    );
  }
  return (
    <section aria-label="Tạo khoá học" className={`${card} w-full p-6`}>
      <h2 className="mb-4 text-lg font-bold">Tạo khoá học mới (nháp)</h2>
      <CourseForm
        initial={EMPTY_COURSE}
        submitLabel="Tạo khoá nháp"
        onCancel={() => setOpen(false)}
        onSubmit={async (f) => {
          const { data, error } = await getBrowserClient()
            .from("courses")
            .insert({ ...formToRow(f), status: "draft" })
            .select("id")
            .single();
          if (error) return courseSaveError(error);
          router.push(`/noi-bo/khoa-hoc/${(data as { id: string }).id}`);
        }}
      />
    </section>
  );
}
