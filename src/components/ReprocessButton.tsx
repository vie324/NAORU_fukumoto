"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toErrorMessage } from "@/lib/errors";

/** 文字起こし→評価を再実行するボタン（エラー時の復旧用）。 */
export function ReprocessButton({ recordingId }: { recordingId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const t = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ recordingId }),
      });
      if (!t.ok) {
        const j = (await t.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "文字起こしに失敗しました。");
      }
      const e = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ recordingId }),
      });
      if (!e.ok) {
        const j = (await e.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "評価に失敗しました。");
      }
      router.refresh();
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        className="btn-secondary px-4 py-2 text-sm"
        onClick={run}
        disabled={busy}
      >
        {busy ? "再処理中…" : "もう一度処理する"}
      </button>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
