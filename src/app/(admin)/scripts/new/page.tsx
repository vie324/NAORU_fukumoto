import Link from "next/link";
import { createScript } from "@/lib/actions/scripts";
import { ScriptForm } from "../ScriptForm";

export const dynamic = "force-dynamic";

export default function NewScriptPage() {
  return (
    <div className="space-y-5">
      <div>
        <Link href="/scripts" className="text-sm text-slate-500 hover:text-brand">
          ← スクリプト一覧に戻る
        </Link>
        <h1 className="mt-2 text-xl font-bold">スクリプトを新規作成</h1>
      </div>
      <ScriptForm action={createScript} submitLabel="作成する" />
    </div>
  );
}
