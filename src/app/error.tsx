"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="card max-w-md space-y-4 text-center">
        <h1 className="text-lg font-bold text-slate-800">
          エラーが発生しました
        </h1>
        <p className="text-sm text-slate-500">
          一時的な問題の可能性があります。もう一度お試しください。
        </p>
        <button className="btn-primary" onClick={reset}>
          再試行
        </button>
      </div>
    </main>
  );
}
