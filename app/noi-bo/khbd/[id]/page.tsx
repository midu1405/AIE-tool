import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ReviewPanel, type FeedbackRow, type ReviewRow, type VersionRow } from "@/components/khbd/ReviewPanel";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Duyệt bài" };

export default function Page({ params, searchParams }: PageProps<"/noi-bo/khbd/[id]">) {
  return (
    <Suspense fallback={<p className="text-muted">Đang tải bài…</p>}>
      <Body params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Body({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const [{ data: doc }, { data: versions }, user] = await Promise.all([
    supabase.from("documents").select("id, title, grade, topic_name, periods, created_mode, deploy_format, current_version_id").eq("id", id).maybeSingle(),
    supabase
      .from("document_versions")
      .select("id, version_no, status, web_view_link, content, warnings, created_at, approved_at, job_id")
      .eq("document_id", id)
      .order("version_no", { ascending: false }),
    getCurrentUser(),
  ]);
  if (!doc) notFound();
  const list = (versions ?? []) as VersionRow[];
  const wanted = Number(typeof sp.v === "string" ? sp.v : NaN);
  const version = list.find((v) => v.version_no === wanted) ?? list[0] ?? null;

  let feedback: FeedbackRow[] = [];
  let review: ReviewRow | null = null;
  let bases: string[] = [];
  if (version) {
    const [{ data: fb }, { data: rv }, { data: job }] = await Promise.all([
      supabase
        .from("feedback_items")
        .select("id, source, author, anchor, content, status, created_at")
        .eq("document_version_id", version.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("reviews")
        .select("decision, rubric, summary, created_at")
        .eq("document_version_id", version.id)
        .eq("reviewer_type", "human")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      version.job_id ? supabase.from("generation_jobs").select("options").eq("id", version.job_id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    feedback = (fb ?? []) as FeedbackRow[];
    review = (rv as ReviewRow | null) ?? null;
    bases = ((job as { options?: { bases?: string[] } } | null)?.options?.bases ?? []) as string[];
  }

  const canReview = !!user && user.roles.some((r) => r === "admin" || r === "reviewer" || r === "content_manager");

  return (
    <>
      <nav aria-label="Đường dẫn" className="flex flex-wrap gap-2 text-sm text-muted">
        <Link href="/noi-bo/khbd" className="text-muted">
          Danh sách KHBD
        </Link>
        <span aria-hidden="true">›</span>
        <span>{doc.title}</span>
      </nav>
      <ReviewPanel
        doc={doc}
        versions={list}
        version={version}
        feedback={feedback}
        review={review}
        bases={bases}
        canReview={canReview}
        userName={user?.name ?? ""}
      />
    </>
  );
}
