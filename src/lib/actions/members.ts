"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { toErrorMessage } from "@/lib/errors";

export type ActionState = { error: string | null; ok?: boolean };

export async function createStore(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "店舗名を入力してください。" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("stores")
    .insert({ tenant_id: profile.tenant_id, name });
  if (error) return { error: error.message };

  revalidatePath("/members");
  return { error: null, ok: true };
}

export async function inviteMember(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();
  const email = String(formData.get("email") ?? "").trim();
  const displayName = String(formData.get("display_name") ?? "").trim();
  const role =
    String(formData.get("role") ?? "staff") === "admin" ? "admin" : "staff";
  const storeId = String(formData.get("store_id") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "メールアドレスと初期パスワードを入力してください。" };
  }
  if (password.length < 8) {
    return { error: "初期パスワードは8文字以上にしてください。" };
  }

  try {
    const service = createAdminClient();
    const { error } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        tenant_id: admin.tenant_id,
        store_id: storeId || "",
        display_name: displayName || email.split("@")[0],
        role,
      },
    });
    if (error) return { error: error.message };
  } catch (e) {
    return { error: toErrorMessage(e) };
  }

  revalidatePath("/members");
  return { error: null, ok: true };
}

export async function updateMember(
  memberId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();
  const role =
    String(formData.get("role") ?? "staff") === "admin" ? "admin" : "staff";
  const storeIdRaw = String(formData.get("store_id") ?? "").trim();
  const store_id = storeIdRaw || null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role, store_id })
    .eq("id", memberId)
    .eq("tenant_id", admin.tenant_id);
  if (error) return { error: error.message };

  revalidatePath("/members");
  return { error: null, ok: true };
}
