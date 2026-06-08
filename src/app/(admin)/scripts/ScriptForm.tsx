"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CATEGORY_OPTIONS } from "@/lib/labels";
import type { ScriptFormState } from "@/lib/actions/scripts";

export interface ScriptFormValues {
  title?: string;
  category?: string;
  body?: string;
  required_keywords?: string[];
  criteria?: { name: string; description?: string }[];
  weights?: { keyword_coverage?: number; flow?: number; tone?: number };
  is_active?: boolean;
}

const initialState: ScriptFormState = { error: null };

export function ScriptForm({
  action,
  values,
  submitLabel,
}: {
  action: (
    prev: ScriptFormState,
    formData: FormData,
  ) => Promise<ScriptFormState>;
  values?: ScriptFormValues;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  const criteriaText = (values?.criteria ?? [])
    .map((c) => (c.description ? `${c.name}: ${c.description}` : c.name))
    .join("\n");

  return (
    <form action={formAction} className="space-y-5">
      <div className="card space-y-4">
        <div>
          <label className="label" htmlFor="title">
            タイトル
          </label>
          <input
            id="title"
            name="title"
            className="input"
            defaultValue={values?.title ?? ""}
            placeholder="初回カウンセリング標準トーク"
            required
          />
        </div>

        <div>
          <label className="label" htmlFor="category">
            カテゴリ
          </label>
          <select
            id="category"
            name="category"
            className="input"
            defaultValue={values?.category ?? "counseling"}
          >
            {CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="body">
            スクリプト本文
          </label>
          <textarea
            id="body"
            name="body"
            className="input min-h-40 font-mono text-xs"
            defaultValue={values?.body ?? ""}
            placeholder="挨拶→ヒアリング→提案→クロージング…"
          />
        </div>
      </div>

      <div className="card space-y-4">
        <div>
          <label className="label" htmlFor="required_keywords">
            必須キーワード（1行に1つ）
          </label>
          <textarea
            id="required_keywords"
            name="required_keywords"
            className="input min-h-28 text-sm"
            defaultValue={(values?.required_keywords ?? []).join("\n")}
            placeholder={"次回予約\nホームケア\n保証"}
          />
          <p className="mt-1 text-xs text-slate-400">
            意味的に登場すれば網羅したと判定します（完全一致は不要）。
          </p>
        </div>

        <div>
          <label className="label">配点（合計が100でなくても内部で正規化）</label>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <span className="text-xs text-slate-500">網羅率</span>
              <input
                type="number"
                name="w_keyword"
                min={0}
                className="input"
                defaultValue={values?.weights?.keyword_coverage ?? 40}
              />
            </div>
            <div>
              <span className="text-xs text-slate-500">流れ</span>
              <input
                type="number"
                name="w_flow"
                min={0}
                className="input"
                defaultValue={values?.weights?.flow ?? 35}
              />
            </div>
            <div>
              <span className="text-xs text-slate-500">トーン</span>
              <input
                type="number"
                name="w_tone"
                min={0}
                className="input"
                defaultValue={values?.weights?.tone ?? 25}
              />
            </div>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="criteria">
            追加の評価観点（任意・1行に「名前: 説明」）
          </label>
          <textarea
            id="criteria"
            name="criteria"
            className="input min-h-24 text-sm"
            defaultValue={criteriaText}
            placeholder={"傾聴: 相手の話を遮らず聞けているか\nクロージングの自然さ"}
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={values?.is_active ?? true}
          />
          有効（録音画面の選択肢に表示）
        </label>
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div className="flex gap-3">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "保存中…" : submitLabel}
        </button>
        <Link href="/scripts" className="btn-secondary">
          キャンセル
        </Link>
      </div>
    </form>
  );
}
