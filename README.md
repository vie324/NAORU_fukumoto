# トークスクリプト評価ツール

サロン・整体店舗のスタッフ研修用。カウンセリングやクロージングのトークを
**録音 → 文字起こし（Whisper）→ 理想スクリプトと照合して点数化＋フィードバック（Claude）**
するツールです。スコアは履歴として蓄積し、管理者が店舗・スタッフ単位で進捗を確認できます。

- マルチテナント（テナント＝契約企業／店舗／スタッフの階層）
- Supabase（PostgreSQL + RLS + Storage + Auth）
- Next.js 15 (App Router) + TypeScript + Tailwind CSS

詳細な設計規約は [`CLAUDE.md`](./CLAUDE.md) を参照してください。

## セットアップ

### 1. 依存インストール

```bash
npm install
```

### 2. Supabase プロジェクト（Tokyo / ap-northeast-1）

専用プロジェクトを作成し、SQL Editor で以下を実行します。

1. `supabase/migrations/0001_init.sql` — テーブル・RLS・トリガ・Storage バケット

> Storage バケット `recordings`（非公開）はマイグレーションで自動作成されます。

### 3. 環境変数

`.env.example` を `.env.local` にコピーして値を設定します。

```bash
cp .env.example .env.local
```

| 変数 | 用途 | 露出 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL | クライアント可 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key | クライアント可 |
| `SUPABASE_SERVICE_ROLE_KEY` | service role | **サーバー専用** |
| `OPENAI_API_KEY` | Whisper | **サーバー専用** |
| `ANTHROPIC_API_KEY` | Claude | **サーバー専用** |
| `ANTHROPIC_MODEL` | 評価モデルID（既定 `claude-sonnet-4-5`） | サーバー |
| `NEXT_PUBLIC_RECORDING_SEGMENT_SEC` | 録音セグメント長（秒、既定 300） | クライアント可 |

### 4. シードデータ投入

テナント1・店舗1・管理者1・スタッフ1・サンプルスクリプト1を作成します。
`.env.local` に Supabase の URL と service role key が必要です。

```bash
npm run seed
```

出力されるログイン用メール／パスワードでログインできます。

### 5. 開発サーバー

```bash
npm run dev
# http://localhost:3000
```

## 検証コマンド

```bash
npm run typecheck   # 型チェック
npm run build       # 本番ビルド
```

## デプロイ（Vercel）

- feature ブランチを push すると Preview デプロイが作成されます。
- Vercel の環境変数に上表の値を設定してください（`NEXT_PUBLIC_*` 以外は Production/Preview のみ）。

## 主要な処理フロー

1. クライアントが音声を（長尺はセグメント分割して）Storage にアップロードし、
   `recordings`(status=`uploaded`) と `recording_segments` を作成。
2. `/api/transcribe` が各セグメントを Whisper で文字起こしし、結合して
   `recordings.transcript` に保存（status=`transcribed`）。
3. `/api/evaluate` が Claude で評価し、`evaluations` を作成（status=`evaluated`）。
   総合点はサーバー側で rubric の重みから再計算して保存。
4. クライアントは status をポーリングして進捗・結果を表示。

## 制限事項・今後の拡張

- **長尺録音の処理時間**: 録音はセグメント分割して保存し逐次文字起こしするため
  25MB 上限は回避できますが、文字起こし＋評価を同期的に実行するため、非常に長い
  録音では処理に時間がかかります。Vercel の関数タイムアウト（プランにより 60〜300 秒）
  を超える規模では、キュー／バックグラウンドジョブ化を推奨します。
- **履歴画面の音声再生**: 現状は文字起こしとスコアのみ表示。音声を再生する場合は
  サーバー側で署名付き URL を発行して再生する想定（バケットは非公開のまま）。
- **スタッフ招待**: メール送信ではなく管理者が初期パスワードを設定する方式（SMTP 不要）。
  メール招待に切り替える場合は Supabase の招待メール設定を利用します。
- **再評価の履歴**: 1録音に対し評価は複数行を許容し、最新を表示します（全履歴を保持）。
