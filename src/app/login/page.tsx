import { redirect } from "next/navigation";
import { getProfile, homePathForRole } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const profile = await getProfile();
  if (profile) redirect(homePathForRole(profile.role));

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold text-slate-900">
            トークスクリプト評価ツール
          </h1>
          <p className="text-sm text-slate-500">ログインしてください</p>
        </div>
        <div className="card">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
