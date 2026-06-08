"use client";

import { useActionState } from "react";
import { createStore, type ActionState } from "@/lib/actions/members";

const initial: ActionState = { error: null };

export function StoreForm() {
  const [state, action, pending] = useActionState(createStore, initial);
  return (
    <div className="space-y-2">
      <form action={action} className="flex gap-2">
        <input
          name="name"
          className="input"
          placeholder="店舗名（例: 渋谷店）"
          required
        />
        <button className="btn-primary shrink-0" disabled={pending}>
          {pending ? "追加中…" : "追加"}
        </button>
      </form>
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      {state.ok && <p className="text-sm text-emerald-700">追加しました。</p>}
    </div>
  );
}
