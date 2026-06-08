"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** 終端状態（evaluated/error）になるまで一定間隔でサーバーコンポーネントを再取得する。 */
export function StatusPoller({
  status,
  intervalMs = 4000,
}: {
  status: string;
  intervalMs?: number;
}) {
  const router = useRouter();
  useEffect(() => {
    if (status === "evaluated" || status === "error") return;
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [status, intervalMs, router]);
  return null;
}
