"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Rubric } from "@/lib/types";

export type ScriptFormState = { error: string | null };

function parseLines(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseCriteria(raw: string): { name: string; description?: string }[] {
  return parseLines(raw).map((line) => {
    const idx = line.indexOf(":");
    const idxFull = line.indexOf("："); // 全角コロンも許容
    const sep = idx === -1 ? idxFull : idxFull === -1 ? idx : Math.min(idx, idxFull);
    if (sep === -1) return { name: line };
    const name = line.slice(0, sep).trim();
    const description = line.slice(sep + 1).trim();
    return description ? { name, description } : { name };
  });
}

function num(v: FormDataEntryValue | null, def: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : def;
}

function buildPayload(formData: FormData, tenantId: string) {
  return {
    tenant_id: tenantId,
    title: String(formData.get("title") ?? "").trim(),
    category: String(formData.get("category") ?? "other"),
    body: String(formData.get("body") ?? ""),
    required_keywords: parseLines(String(formData.get("required_keywords") ?? "")),
    rubric: {
      weights: {
        keyword_coverage: num(formData.get("w_keyword"), 40),
        flow: num(formData.get("w_flow"), 35),
        tone: num(formData.get("w_tone"), 25),
      },
      criteria: parseCriteria(String(formData.get("criteria") ?? "")),
    } satisfies Rubric,
    is_active: formData.get("is_active") === "on",
  };
}

export async function createScript(
  _prev: ScriptFormState,
  formData: FormData,
): Promise<ScriptFormState> {
  const profile = await requireAdmin();
  const payload = buildPayload(formData, profile.tenant_id);
  if (!payload.title) return { error: "タイトルを入力してください。" };

  const supabase = await createClient();
  const { error } = await supabase.from("scripts").insert(payload);
  if (error) return { error: error.message };

  revalidatePath("/scripts");
  redirect("/scripts");
}

export async function updateScript(
  id: string,
  _prev: ScriptFormState,
  formData: FormData,
): Promise<ScriptFormState> {
  const profile = await requireAdmin();
  const { tenant_id: _tenant, ...rest } = buildPayload(formData, profile.tenant_id);
  if (!rest.title) return { error: "タイトルを入力してください。" };

  const supabase = await createClient();
  const { error } = await supabase.from("scripts").update(rest).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/scripts");
  redirect("/scripts");
}

export async function deleteScript(id: string): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("scripts").delete().eq("id", id);
  revalidatePath("/scripts");
  redirect("/scripts");
}
