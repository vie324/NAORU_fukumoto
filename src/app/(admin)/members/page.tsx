import { createClient } from "@/lib/supabase/server";
import { StoreForm } from "./StoreForm";
import { InviteMemberForm } from "./InviteMemberForm";
import { MemberEditForm } from "./MemberEditForm";

export const dynamic = "force-dynamic";

interface Member {
  id: string;
  display_name: string;
  role: string;
  store_id: string | null;
}

export default async function MembersPage() {
  const supabase = await createClient();

  const [storesRes, membersRes] = await Promise.all([
    supabase.from("stores").select("id,name").order("created_at"),
    supabase
      .from("profiles")
      .select("id,display_name,role,store_id")
      .order("created_at"),
  ]);

  const stores = (storesRes.data ?? []) as { id: string; name: string }[];
  const members = (membersRes.data ?? []) as Member[];
  const storeNameById = new Map(stores.map((s) => [s.id, s.name]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">スタッフ・店舗管理</h1>
        <p className="mt-1 text-sm text-slate-500">
          店舗の登録と、スタッフの招待・ロール設定・店舗割り当てを行います。
        </p>
      </div>

      {/* 店舗 */}
      <div className="card space-y-4">
        <h2 className="text-sm font-semibold text-slate-700">店舗</h2>
        {stores.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {stores.map((s) => (
              <li
                key={s.id}
                className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700"
              >
                {s.name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">まだ店舗がありません。</p>
        )}
        <StoreForm />
      </div>

      {/* メンバー */}
      <div className="card space-y-4">
        <h2 className="text-sm font-semibold text-slate-700">メンバー</h2>
        <div className="space-y-3">
          {members.map((m) => (
            <div
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0"
            >
              <div>
                <div className="font-medium text-slate-800">
                  {m.display_name || "（名前未設定）"}
                </div>
                <div className="text-xs text-slate-400">
                  {m.role === "admin" ? "管理者" : "スタッフ"}
                  {" ・ "}
                  {m.store_id
                    ? (storeNameById.get(m.store_id) ?? "（不明な店舗）")
                    : "店舗未割り当て"}
                </div>
              </div>
              <MemberEditForm member={m} stores={stores} />
            </div>
          ))}
        </div>
      </div>

      {/* 招待 */}
      <div className="card space-y-4">
        <h2 className="text-sm font-semibold text-slate-700">スタッフを招待</h2>
        <InviteMemberForm stores={stores} />
      </div>
    </div>
  );
}
