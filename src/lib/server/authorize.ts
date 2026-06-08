import { createClient } from "@/lib/supabase/server";

export type AuthzResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

/**
 * 現在のユーザーが対象 recording にアクセスできるかを RLS で判定する。
 * staff は自分の録音、admin は同一テナントの録音のみ true。
 */
export async function authorizeRecordingAccess(
  recordingId: string,
): Promise<AuthzResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401, error: "認証が必要です。" };

  const { data } = await supabase
    .from("recordings")
    .select("id")
    .eq("id", recordingId)
    .maybeSingle();

  if (!data) {
    return { ok: false, status: 404, error: "対象の録音が見つかりません。" };
  }
  return { ok: true };
}
