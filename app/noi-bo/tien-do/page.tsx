import { Suspense } from "react";
import { JobProgress } from "@/components/khbd/JobProgress";

export const metadata = { title: "Tiến độ soạn" };

export default function Page() {
  return (
    <Suspense fallback={<p className="text-muted">Đang tải tiến độ…</p>}>
      <JobProgress />
    </Suspense>
  );
}
