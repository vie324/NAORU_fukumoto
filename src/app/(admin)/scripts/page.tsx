import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { categoryLabel } from "@/lib/labels";

export const dynamic = "force-dynamic";

interface ScriptRow {
  id: string;
  title: string;
  category: string;
  is_active: boolean;
  required_keywords: string[];
}

export default async function ScriptsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("scripts")
    .select("id,title,category,is_active,required_keywords")
    .order("created_at", { ascending: true });

  const scripts = (data ?? []) as unknown as ScriptRow[];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">スクリプト管理</h1>
          <p className="mt-1 text-sm text-slate-500">
            評価の基準となる理想のトークスクリプトを管理します。
          </p>
        </div>
        <Link href="/scripts/new" className="btn-primary">
          新規作成
        </Link>
      </div>

      {scripts.length === 0 ? (
        <div className="card text-center text-sm text-slate-500">
          まだスクリプトがありません。「新規作成」から登録してください。
        </div>
      ) : (
        <div className="space-y-3">
          {scripts.map((s) => (
            <Link
              key={s.id}
              href={`/scripts/${s.id}`}
              className="card flex items-center gap-4 transition-colors hover:border-brand/40 hover:bg-slate-50"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                    {categoryLabel(s.category)}
                  </span>
                  <span className="truncate font-medium">{s.title}</span>
                  {!s.is_active && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-400">
                      無効
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  必須キーワード {(s.required_keywords ?? []).length} 件
                </p>
              </div>
              <span className="shrink-0 text-sm text-slate-400">編集 →</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
