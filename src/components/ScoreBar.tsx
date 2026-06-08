import { formatScore } from "@/lib/format";

function colorFor(value: number): string {
  if (value >= 80) return "bg-emerald-500";
  if (value >= 60) return "bg-amber-500";
  return "bg-red-500";
}

export function ScoreBar({
  label,
  value,
  weight,
}: {
  label: string;
  value: number;
  weight?: number;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-slate-600">
          {label}
          {weight != null && (
            <span className="ml-1 text-xs text-slate-400">（重み{weight}%）</span>
          )}
        </span>
        <span className="font-semibold tabular-nums">{formatScore(value)}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-2 rounded-full ${colorFor(value)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
