import type { RecordingStatus, ScriptCategory } from "./types";

export const CATEGORY_OPTIONS: { value: ScriptCategory; label: string }[] = [
  { value: "counseling", label: "カウンセリング" },
  { value: "closing", label: "クロージング" },
  { value: "objection", label: "反論対応" },
  { value: "other", label: "その他" },
];

export function categoryLabel(c: ScriptCategory | string): string {
  return CATEGORY_OPTIONS.find((o) => o.value === c)?.label ?? String(c);
}

const STATUS_LABELS: Record<RecordingStatus, string> = {
  uploaded: "アップロード済み",
  transcribing: "文字起こし中",
  transcribed: "文字起こし完了",
  evaluating: "評価中",
  evaluated: "評価完了",
  error: "エラー",
};

export function statusLabel(s: RecordingStatus | string): string {
  return STATUS_LABELS[s as RecordingStatus] ?? String(s);
}

/** ステータスに応じた Tailwind バッジ色。 */
export function statusBadgeClass(s: RecordingStatus | string): string {
  switch (s) {
    case "evaluated":
      return "bg-emerald-100 text-emerald-700";
    case "error":
      return "bg-red-100 text-red-700";
    case "uploaded":
      return "bg-slate-100 text-slate-600";
    default:
      return "bg-amber-100 text-amber-700";
  }
}
