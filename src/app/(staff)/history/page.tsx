import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime, formatDuration, formatScore } from "@/lib/format";
import { categoryLabel } from "@/lib/labels";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

interface HistoryRow {
  id: string;
  created_at: string;
  status: string;
  duration_sec: number | null;
  script: { title: string; category: string } | null;
  evaluations: { total_score: number; created_at: string }[];
}

function latestScore(row: HistoryRow): number | null {
  const evals = row.evaluations ?? [];
  if (evals.length === 0) return null;
  const latest = [...evals].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  )[0];
  return latest.total_score;
}

export default async function HistoryPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data } = await supabase
    .from("recordings")
    .select(
      "id, created_at, status, duration_sec, script:scripts(title,category), evaluations(total_score, created_at)",
    )
    .eq("staff_id", profile.id)
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as unknown as HistoryRow[];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">スコア履歴</h1>
        <p className="mt-1 text-sm text-slate-500">
          過去の録音と評価結果を確認できます。
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="card text-center">
          <p className="text-sm text-slate-500">まだ録音がありません。</p>
          <Link
            href="/record"
            className="btn-primary mt-3 inline-flex px-4 py-2 text-sm"
          >
            録音をはじめる
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const score = latestScore(row);
            return (
              <Link
                key={row.id}
                href={`/history/${row.id}`}
                className="card flex items-center gap-4 transition-colors hover:border-brand/40 hover:bg-slate-50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                      {categoryLabel(row.script?.category ?? "other")}
                    </span>
                    <span className="truncate font-medium">
                      {row.script?.title ?? "（不明なスクリプト）"}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
                    <span>{formatDateTime(row.created_at)}</span>
                    {row.duration_sec != null && (
                      <span>{formatDuration(row.duration_sec)}</span>
                    )}
                    <StatusBadge status={row.status} />
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  {score != null ? (
                    <>
                      <div className="text-2xl font-bold tabular-nums text-slate-800">
                        {formatScore(score)}
                      </div>
                      <div className="text-[10px] text-slate-400">/ 100</div>
                    </>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
