import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ScriptCategory } from "@/lib/types";
import { Recorder } from "./Recorder";

export const dynamic = "force-dynamic";

export default async function RecordPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: scripts } = await supabase
    .from("scripts")
    .select("id,title,category")
    .eq("is_active", true)
    .order("category", { ascending: true })
    .order("created_at", { ascending: true });

  const options = (scripts ?? []) as {
    id: string;
    title: string;
    category: ScriptCategory;
  }[];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">録音</h1>
        <p className="mt-1 text-sm text-slate-500">
          スクリプトを選んでトークを録音し、提出してください。
        </p>
      </div>
      <Recorder
        scripts={options}
        staffId={profile.id}
        tenantId={profile.tenant_id}
        storeId={profile.store_id}
      />
    </div>
  );
}
