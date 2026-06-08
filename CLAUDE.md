# CLAUDE.md — プロジェクト規約

トークスクリプト評価ツール（サロン・整体スタッフ研修用）。
スタッフのトークを録音 → Whisper で文字起こし → 理想スクリプトと照合して
Claude が点数化＋フィードバック。スコアは履歴として蓄積し、管理者が
店舗・スタッフ単位で進捗を確認する。

将来的に既存の si'se ダッシュボード（Next.js + Supabase マルチテナント基盤）へ
統合する想定のため、設計思想（マルチテナント・RLS・店舗/スタッフ階層）を揃える。

## 技術スタック

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS（自前の最小コンポーネント。shadcn/ui は未使用）
- Supabase（PostgreSQL + RLS、Storage、Auth）リージョン Tokyo / ap-northeast-1
- OpenAI Whisper（文字起こし、`whisper-1`）— サーバー専用
- Anthropic Claude（評価、既定 `claude-sonnet-4-6`、`ANTHROPIC_MODEL` で上書き可）— サーバー専用
- Vercel デプロイ（feature ブランチ → Preview）

## ディレクトリ

```
src/app/                  ルーティング（App Router）
  login/                  ログイン
  (staff)/record          録音→提出
  (staff)/history         スコア履歴 / 詳細
  (admin)/dashboard       店舗・スタッフ別の集計
  (admin)/scripts         スクリプト CRUD
  (admin)/members         スタッフ・店舗管理
  api/transcribe          Whisper 文字起こし（Route Handler）
  api/evaluate            Claude 評価（Route Handler）
src/lib/
  supabase/{client,server,admin}.ts   3種の Supabase クライアント
  openai.ts / anthropic.ts            外部 API ラッパー
  scoring.ts                          総合スコアのサーバー再計算
  types.ts / constants.ts             共有型・定数
supabase/migrations/      スキーマ + RLS（SQL）
scripts/seed.ts           シードデータ投入（service role）
```

## 絶対的な規約（セキュリティ）

- **API キーはサーバー側のみ**。`OPENAI_API_KEY` / `ANTHROPIC_API_KEY` /
  `SUPABASE_SERVICE_ROLE_KEY` を Client Component・ブラウザに**絶対に出さない**。
  これらを参照するのは Route Handler / Server Action / `lib/*`（サーバー実行）に限る。
- ブラウザに出してよいのは `NEXT_PUBLIC_*`（Supabase URL と anon key）まで。
- 録音音声は個人情報を含みうる。Storage バケット `recordings` は**非公開**、
  アクセスは**署名付き URL**（サーバー生成）に限定。
- 文字起こし・評価の外部 API 呼び出しは必ず `try/catch` で握り、失敗時は
  `recordings.status = 'error'` と `error_message` を記録してユーザーに返す。

## 評価ロジック（ハイブリッド）

総合点 `total_score` は加重平均（重みは `scripts.rubric.weights`、既定 40/35/25）:

- `keyword_coverage`（既定 40%）: 必須キーワードの網羅率。文字列一致ではなく
  Claude が意味的に登場したか判定（表記ゆれ・言い換え許容）。**網羅率は
  `lib/scoring.ts` がサーバー側で再計算**（母数=required_keywords）。
- `flow_score`（既定 35%）: 会話の論理展開（挨拶→ヒアリング→提案→クロージング等）。
- `tone_score`（既定 25%）: 言葉遣い・共感・押し付けがましさ等。

**`total_score` はモデル任せにせず、`lib/scoring.ts` で重みから再計算して保存**。
モデルが返す `total_score` は参考値。

Claude の出力は **JSON のみ**を強制し、`JSON.parse` 前に必ずコードフェンス（```）
除去のガードを通す（`lib/anthropic.ts`）。

## 処理フロー（録音→評価）

1. クライアントが音声を（長尺はセグメント分割して）Storage にアップロード →
   `recordings`(status=`uploaded`) と `recording_segments` を作成。
2. `/api/transcribe` → 各セグメントを Whisper で文字起こし → 結合して
   `recordings.transcript` 保存、status=`transcribed`。
3. `/api/evaluate` → Claude 評価 → `evaluations` 作成、status=`evaluated`。
4. クライアントは status をポーリングして進捗・結果を表示。

各段階は status で細かく持ち、途中失敗時にやり直せるようにする。

## マルチテナント / RLS

- `staff`: 自分の `staff_id` のレコードのみ閲覧可。
- `admin`: 同一 `tenant_id` 内の全レコード閲覧可。`scripts` の編集は admin のみ。
- RLS ヘルパー `auth_tenant_id()` / `auth_role()` / `is_admin()` は SECURITY DEFINER。
- 新規 auth ユーザーは `handle_new_user` トリガで `profiles` を自動生成。招待時に
  `user_metadata`（tenant_id / store_id / display_name / role）を渡す。

## ブランチ戦略

- 開発は feature ブランチ（例: `claude/...`）で行う。
- push すると Vercel が Preview デプロイを作成 → そこで動作確認。
- main へのマージで本番反映。コミットは意味単位で。

## UI 方針

- 日本語 UI。フィードバックは前向きで具体的に。
- iPad / PC 両対応。録音は MediaRecorder（`audio/webm` または `audio/mp4`）。

## 検証

- `npm run typecheck` と `npm run build` を通すこと。
- 外部サービス（Supabase / OpenAI / Anthropic）の疎通確認には実クレデンシャルが必要。
  `.env.local` を用意し、`supabase/migrations` を適用、`npm run seed` 後に `npm run dev`。
