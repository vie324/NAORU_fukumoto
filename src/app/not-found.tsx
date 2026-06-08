import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="card max-w-md space-y-4 text-center">
        <h1 className="text-lg font-bold text-slate-800">
          ページが見つかりません
        </h1>
        <p className="text-sm text-slate-500">
          お探しのページは存在しないか、アクセス権がありません。
        </p>
        <Link href="/" className="btn-primary inline-flex">
          ホームに戻る
        </Link>
      </div>
    </main>
  );
}
