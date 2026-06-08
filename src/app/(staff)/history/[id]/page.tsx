import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime, formatDuration } from "@/lib/format";
import { categoryLabel } from "@/lib/labels";
import { StatusBadge } from "@/components/StatusBadge";
import { StatusPoller } from "@/components/StatusPoller";
import { ReprocessButton } from "@/components/ReprocessButton";
import { EvaluationView } from "@/components/EvaluationView";
import type { Evaluation, Rubric } from "@/lib/types";

export const dynamic = "force-dynamic";

interface RecordingDetail {
  id: string;
  created_at: string;
  status: string;
  duration_sec: number | null;
  transcript: string | null;
  error_message: string | null;
  script: {
    title: string;
    category: string;
    rubric: Rubric;
  } | null;
  evaluations: Evaluation[];
}

export default async function HistoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireProfile();
  const supabase = await createClient();

  const { data } = await supabase
    .from("recordings")
    .select(
      "id, created_at, status, duration_sec, transcript, error_message, script:scripts(title,category,rubric), evaluations(*)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const rec = data as unknown as RecordingDetail;

  const evaluation = [...(rec.evaluations ?? [])].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  )[0];

  return (
    <div className="space-y-5">
      <StatusPoller status={rec.status} />

      <div>
        <Link
          href="/history"
          className="text-sm text-slate-500 hover:text-brand"
        >
          ← スコア履歴に戻る
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
            {categoryLabel(rec.script?.category ?? "other")}
          </span>
          <h1 className="text-xl font-bold">
            {rec.script?.title ?? "（不明なスクリプト）"}
          </h1>
        </div>
        <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
          <span>{formatDateTime(rec.created_at)}</span>
          {rec.duration_sec != null && (
            <span>{formatDuration(rec.duration_sec)}</span>
          )}
          <StatusBadge status={rec.status} />
        </div>
      </div>

      {rec.status === "error" ? (
        <div className="card space-y-3 border-red-200 bg-red-50">
          <p className="text-sm font-medium text-red-800">
            処理中にエラーが発生しました。
          </p>
          {rec.error_message && (
            <p className="text-sm text-red-700">{rec.error_message}</p>
          )}
          <ReprocessButton recordingId={rec.id} />
        </div>
      ) : evaluation ? (
        <EvaluationView
          evaluation={evaluation}
          rubric={rec.script?.rubric}
          transcript={rec.transcript}
        />
      ) : (
        <div className="card space-y-2">
          <p className="text-sm font-medium text-slate-700">処理中です…</p>
          <p className="text-sm text-slate-500">
            文字起こしと評価が完了すると、ここに結果が表示されます。この画面は自動で更新されます。
          </p>
        </div>
      )}
    </div>
  );
}
