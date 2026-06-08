import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Role } from "@/lib/types";

/** ロール別のホームパス。 */
export function homePathForRole(role: Role): string {
  return role === "admin" ? "/dashboard" : "/record";
}

/** 現在のユーザーの profiles 行を返す（未ログイン/プロフィール無しは null）。 */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return (data as Profile | null) ?? null;
}

/** ログイン必須。未ログインなら /login へ。 */
export async function requireProfile(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  return profile;
}

/** 管理者必須。staff は録音画面へ戻す。 */
export async function requireAdmin(): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.role !== "admin") redirect("/record");
  return profile;
}
