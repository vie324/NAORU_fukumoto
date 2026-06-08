/** 秒数を mm:ss / h:mm:ss に整形。 */
export function formatDuration(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

/** ISO 文字列を日本語の日時表記に（Asia/Tokyo 固定でハイドレーション差異を防ぐ）。 */
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tokyo",
  }).format(new Date(iso));
}

/** スコアを小数1桁で表示。 */
export function formatScore(n: number): string {
  return (Math.round(Number(n) * 10) / 10).toString();
}
