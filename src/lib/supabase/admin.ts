import { createClient } from "@supabase/supabase-js";

/**
 * service role を使うサーバー専用クライアント。RLS をバイパスするため、
 * Route Handler / Server Action 内でのみ使用し、テナント境界は自前で検証する。
 * 絶対にクライアントへ露出させないこと。
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL が未設定です。",
    );
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
