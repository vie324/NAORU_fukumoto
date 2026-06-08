"use client";

import { useActionState } from "react";
import { inviteMember, type ActionState } from "@/lib/actions/members";

const initial: ActionState = { error: null };

export function InviteMemberForm({
  stores,
}: {
  stores: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(inviteMember, initial);

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="inv-email">
            メールアドレス
          </label>
          <input
            id="inv-email"
            name="email"
            type="email"
            className="input"
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="inv-name">
            表示名
          </label>
          <input id="inv-name" name="display_name" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="inv-role">
            ロール
          </label>
          <select id="inv-role" name="role" className="input" defaultValue="staff">
            <option value="staff">スタッフ</option>
            <option value="admin">管理者</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="inv-store">
            店舗
          </label>
          <select id="inv-store" name="store_id" className="input" defaultValue="">
            <option value="">（未割り当て）</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="inv-pw">
            初期パスワード（8文字以上・本人に共有してください）
          </label>
          <input
            id="inv-pw"
            name="password"
            type="text"
            className="input"
            minLength={8}
            required
          />
        </div>
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          招待しました。初期パスワードを本人にお伝えください。
        </p>
      )}

      <button className="btn-primary" disabled={pending}>
        {pending ? "招待中…" : "招待する"}
      </button>
    </form>
  );
}
