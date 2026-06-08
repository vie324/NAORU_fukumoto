import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold text-slate-900">
          トークスクリプト評価ツール
        </h1>
        <p className="text-slate-600">
          カウンセリングやクロージングのトークを録音して、理想のスクリプトと照合。
          <br />
          点数とフィードバックで研修をサポートします。
        </p>
      </div>
      <Link href="/login" className="btn-primary px-6 py-3 text-base">
        ログインして始める
      </Link>
    </main>
  );
}
