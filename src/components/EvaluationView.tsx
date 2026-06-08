import { ScoreBar } from "@/components/ScoreBar";
import { formatScore } from "@/lib/format";
import { resolveWeights } from "@/lib/scoring";
import type { Evaluation, Rubric } from "@/lib/types";

function totalColor(value: number): string {
  if (value >= 80) return "text-emerald-600";
  if (value >= 60) return "text-amber-600";
  return "text-red-600";
}

export function EvaluationView({
  evaluation,
  rubric,
  transcript,
}: {
  evaluation: Evaluation;
  rubric?: Rubric | null;
  transcript?: string | null;
}) {
  const weights = resolveWeights(rubric);
  const detail = Object.entries(evaluation.scores_detail ?? {});

  return (
    <div className="space-y-5">
      {/* 総合スコア */}
      <div className="card flex items-center gap-6">
        <div className="text-center">
          <div
            className={`text-5xl font-bold tabular-nums ${totalColor(
              evaluation.total_score,
            )}`}
          >
            {formatScore(evaluation.total_score)}
          </div>
          <div className="text-xs text-slate-400">/ 100</div>
        </div>
        <div className="flex-1 space-y-3">
          <ScoreBar
            label="キーワード網羅率"
            value={evaluation.keyword_coverage}
            weight={weights.keyword_coverage}
          />
          <ScoreBar
            label="会話の流れ"
            value={evaluation.flow_score}
            weight={weights.flow}
          />
          <ScoreBar
            label="トーン・印象"
            value={evaluation.tone_score}
            weight={weights.tone}
          />
        </div>
      </div>

      {/* フィードバック */}
      {evaluation.feedback && (
        <div className="card space-y-2">
          <h2 className="text-sm font-semibold text-slate-700">
            フィードバック
          </h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
            {evaluation.feedback}
          </p>
        </div>
      )}

      {/* 良かった点・改善点 */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card space-y-2">
          <h2 className="text-sm font-semibold text-emerald-700">良かった点</h2>
          {evaluation.strengths?.length ? (
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
              {evaluation.strengths.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">—</p>
          )}
        </div>
        <div className="card space-y-2">
          <h2 className="text-sm font-semibold text-amber-700">改善点</h2>
          {evaluation.improvements?.length ? (
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
              {evaluation.improvements.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">—</p>
          )}
        </div>
      </div>

      {/* キーワード */}
      {(evaluation.keyword_hits?.length > 0 ||
        evaluation.keyword_misses?.length > 0) && (
        <div className="card space-y-3">
          <h2 className="text-sm font-semibold text-slate-700">キーワード</h2>
          {evaluation.keyword_hits?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {evaluation.keyword_hits.map((k, i) => (
                <span
                  key={`h-${i}`}
                  className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs text-emerald-700"
                >
                  ✓ {k}
                </span>
              ))}
            </div>
          )}
          {evaluation.keyword_misses?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {evaluation.keyword_misses.map((k, i) => (
                <span
                  key={`m-${i}`}
                  className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500 line-through"
                >
                  {k}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 観点別スコア */}
      {detail.length > 0 && (
        <div className="card space-y-3">
          <h2 className="text-sm font-semibold text-slate-700">観点別スコア</h2>
          <div className="space-y-3">
            {detail.map(([name, value]) => (
              <ScoreBar key={name} label={name} value={Number(value)} />
            ))}
          </div>
        </div>
      )}

      {/* 文字起こし */}
      {transcript && (
        <details className="card">
          <summary className="cursor-pointer text-sm font-semibold text-slate-700">
            文字起こしを表示
          </summary>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
            {transcript}
          </p>
        </details>
      )}
    </div>
  );
}
