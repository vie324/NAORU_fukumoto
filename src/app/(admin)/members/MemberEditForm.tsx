"use client";

import { useActionState } from "react";
import { updateMember, type ActionState } from "@/lib/actions/members";

const initial: ActionState = { error: null };

export function MemberEditForm({
  member,
  stores,
}: {
  member: { id: string; role: string; store_id: string | null };
  stores: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(
    updateMember.bind(null, member.id),
    initial,
  );

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <select
        name="role"
        className="input w-28"
        defaultValue={member.role}
        aria-label="ロール"
      >
        <option value="staff">スタッフ</option>
        <option value="admin">管理者</option>
      </select>
      <select
        name="store_id"
        className="input w-36"
        defaultValue={member.store_id ?? ""}
        aria-label="店舗"
      >
        <option value="">（未割り当て）</option>
        {stores.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <button className="btn-secondary px-3 py-1.5 text-sm" disabled={pending}>
        {pending ? "保存中…" : "保存"}
      </button>
      {state.error && <span className="text-xs text-red-700">{state.error}</span>}
      {state.ok && <span className="text-xs text-emerald-700">保存しました</span>}
    </form>
  );
}
