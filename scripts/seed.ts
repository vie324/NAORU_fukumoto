/**
 * シードデータ投入スクリプト（service role 使用、サーバー実行専用）。
 *   テナント1・店舗1・管理者1・スタッフ1・サンプルスクリプト1 を作成する。
 * 実行: npm run seed   （.env.local に Supabase URL / service role key が必要）
 * 再実行しても重複しないよう、可能な範囲で冪等にしている。
 */
import { createClient } from "@supabase/supabase-js";

try {
  process.loadEnvFile(".env.local");
} catch {
  // .env.local が無ければ既存の環境変数を使う
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を .env.local に設定してください。",
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TENANT_NAME = "デモサロン";
const STORE_NAME = "本店";
const ADMIN_EMAIL = "admin@example.com";
const STAFF_EMAIL = "staff@example.com";
const PASSWORD = "Password123!";

async function ensureTenant(): Promise<string> {
  const { data: existing } = await admin
    .from("tenants")
    .select("id")
    .eq("name", TENANT_NAME)
    .maybeSingle();
  if (existing) return existing.id;

  const { data, error } = await admin
    .from("tenants")
    .insert({ name: TENANT_NAME })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function ensureStore(tenantId: string): Promise<string> {
  const { data: existing } = await admin
    .from("stores")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("name", STORE_NAME)
    .maybeSingle();
  if (existing) return existing.id;

  const { data, error } = await admin
    .from("stores")
    .insert({ tenant_id: tenantId, name: STORE_NAME })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function findUserByEmail(email: string): Promise<string | null> {
  // ページングして該当メールを探す（シード用途のため簡易実装）。
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw error;
    const found = data.users.find((u) => u.email === email);
    if (found) return found.id;
    if (data.users.length < 200) break;
  }
  return null;
}

async function ensureUser(opts: {
  email: string;
  displayName: string;
  role: "admin" | "staff";
  tenantId: string;
  storeId: string | null;
}): Promise<string> {
  const metadata = {
    tenant_id: opts.tenantId,
    store_id: opts.storeId ?? "",
    display_name: opts.displayName,
    role: opts.role,
  };

  const { data, error } = await admin.auth.admin.createUser({
    email: opts.email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: metadata,
  });

  let userId: string;
  if (error) {
    // 既存ユーザーは作り直さず ID を引く。
    const existingId = await findUserByEmail(opts.email);
    if (!existingId) throw error;
    userId = existingId;
  } else {
    userId = data.user.id;
  }

  // トリガで profiles は作成されるが、再実行時のテナント/ロール整合のため upsert。
  const { error: profErr } = await admin.from("profiles").upsert(
    {
      id: userId,
      tenant_id: opts.tenantId,
      store_id: opts.storeId,
      display_name: opts.displayName,
      role: opts.role,
    },
    { onConflict: "id" },
  );
  if (profErr) throw profErr;

  return userId;
}

async function ensureSampleScript(tenantId: string): Promise<void> {
  const title = "初回カウンセリング標準トーク";
  const { data: existing } = await admin
    .from("scripts")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("title", title)
    .maybeSingle();
  if (existing) return;

  const body = [
    "【挨拶・自己紹介】",
    "本日はご来店ありがとうございます。担当の○○です。よろしくお願いいたします。",
    "",
    "【ヒアリング】",
    "本日はどのようなお悩みでご来店いただきましたか？",
    "普段のお手入れやライフスタイルについても少し伺ってよろしいですか？",
    "（カウンセリングシートを用いて丁寧にヒアリング）",
    "",
    "【施術プランの提案】",
    "お悩みを踏まえて、本日は○○の施術プランをご提案します。",
    "この施術がなぜ効果的か、根拠とあわせてご説明しますね。",
    "",
    "【ホームケアの案内】",
    "効果を保つために、ご自宅でのホームケアもあわせて行うのがおすすめです。",
    "",
    "【クロージング・次回予約】",
    "本日の施術はいかがでしたか？",
    "効果を定着させるため、次回予約を今お取りしておくと安心です。いかがでしょうか？",
    "保証制度もございますのでご安心ください。",
  ].join("\n");

  const { error } = await admin.from("scripts").insert({
    tenant_id: tenantId,
    title,
    category: "counseling",
    body,
    required_keywords: [
      "カウンセリングシート",
      "ヒアリング",
      "施術プランの提案",
      "ホームケア",
      "次回予約",
      "保証",
    ],
    rubric: {
      weights: { keyword_coverage: 40, flow: 35, tone: 25 },
      criteria: [
        { name: "傾聴", description: "相手の話を遮らず共感的に聞けているか" },
        { name: "提案の根拠", description: "施術提案に納得感のある理由を添えているか" },
        {
          name: "クロージングの自然さ",
          description: "押し付けがましくなく次回予約へ繋げられているか",
        },
      ],
    },
    is_active: true,
  });
  if (error) throw error;
}

async function main() {
  console.log("シード投入を開始します…");
  const tenantId = await ensureTenant();
  console.log(`tenant: ${TENANT_NAME} (${tenantId})`);

  const storeId = await ensureStore(tenantId);
  console.log(`store : ${STORE_NAME} (${storeId})`);

  await ensureUser({
    email: ADMIN_EMAIL,
    displayName: "管理者ユーザー",
    role: "admin",
    tenantId,
    storeId: null,
  });
  await ensureUser({
    email: STAFF_EMAIL,
    displayName: "スタッフ太郎",
    role: "staff",
    tenantId,
    storeId,
  });

  await ensureSampleScript(tenantId);
  console.log("サンプルスクリプトを用意しました。");

  console.log("\n完了。以下でログインできます:");
  console.log(`  管理者:  ${ADMIN_EMAIL} / ${PASSWORD}`);
  console.log(`  スタッフ: ${STAFF_EMAIL} / ${PASSWORD}`);
}

main().catch((err: unknown) => {
  console.error("シード投入に失敗しました:", err);
  process.exit(1);
});
