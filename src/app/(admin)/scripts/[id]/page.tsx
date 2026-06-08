import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateScript, deleteScript } from "@/lib/actions/scripts";
import { ScriptForm } from "../ScriptForm";
import { DeleteButton } from "@/components/DeleteButton";
import type { Script } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditScriptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("scripts")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const s = data as Script;

  return (
    <div className="space-y-5">
      <div>
        <Link href="/scripts" className="text-sm text-slate-500 hover:text-brand">
          ← スクリプト一覧に戻る
        </Link>
        <h1 className="mt-2 text-xl font-bold">スクリプトを編集</h1>
      </div>

      <ScriptForm
        action={updateScript.bind(null, id)}
        values={{
          title: s.title,
          category: s.category,
          body: s.body,
          required_keywords: s.required_keywords,
          criteria: s.rubric?.criteria,
          weights: s.rubric?.weights,
          is_active: s.is_active,
        }}
        submitLabel="保存する"
      />

      <div className="card flex items-center justify-between border-red-100">
        <div>
          <p className="text-sm font-medium text-slate-700">スクリプトを削除</p>
          <p className="text-xs text-slate-400">
            この操作は取り消せません。関連する録音は残ります。
          </p>
        </div>
        <DeleteButton
          action={deleteScript.bind(null, id)}
          confirmText="このスクリプトを削除しますか？"
        />
      </div>
    </div>
  );
}
