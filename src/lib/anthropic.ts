import Anthropic from "@anthropic-ai/sdk";
import { ANTHROPIC_MODEL } from "@/lib/constants";
import type { EvaluationModelOutput, Rubric } from "@/lib/types";

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY が未設定です。");
  if (!_client) _client = new Anthropic({ apiKey });
  return _client;
}

const SYSTEM_PROMPT = `あなたは美容サロン・整体店舗のスタッフ研修の評価者です。スタッフのトーク（文字起こし）を、登録された理想のトークスクリプトと照合し、公平かつ建設的に評価します。

評価軸:
1. キーワード網羅率 (keyword_coverage): 必須キーワード/フレーズが「意味的に」登場したか。表記ゆれ・言い換えは許容し、完全一致は不要。
2. 会話の流れ (flow_score): スクリプトの論理展開（挨拶→ヒアリング→提案→クロージング等）に沿い、順序・抜け漏れが少ないか。
3. トーン/印象 (tone_score): 言葉遣い・共感・押し付けがましさのなさ等。

ルール:
- 出力は必ず JSON のみ。前置き・説明・Markdownのコードフェンス(\`\`\`)は一切付けない。
- 各スコアは 0〜100 の数値。
- keyword_hits と keyword_misses は、与えられた required_keywords の文字列をそのまま使う（新しい語を作らない）。意味的に登場していれば hits、していなければ misses に入れる。
- feedback はスタッフ向けに前向きで具体的に、日本語で200〜400字。
- strengths（良かった点）と improvements（改善点）はそれぞれ短い箇条書きの配列。

出力する JSON の形（キーは厳密に一致させる）:
{
  "keyword_coverage": 0,
  "keyword_hits": ["..."],
  "keyword_misses": ["..."],
  "flow_score": 0,
  "tone_score": 0,
  "scores_detail": { "観点名": 0 },
  "total_score": 0,
  "feedback": "...",
  "strengths": ["..."],
  "improvements": ["..."]
}`;

function buildUserPrompt(input: {
  scriptBody: string;
  requiredKeywords: string[];
  rubric: Rubric;
  transcript: string;
}): string {
  const criteria = (input.rubric?.criteria ?? [])
    .map((c) => `- ${c.name}${c.description ? `: ${c.description}` : ""}`)
    .join("\n");

  return [
    "# 理想のトークスクリプト",
    input.scriptBody || "(未登録)",
    "",
    "# 必須キーワード（required_keywords）",
    JSON.stringify(input.requiredKeywords ?? []),
    "",
    "# 追加の評価観点（scores_detail にこの名前で 0〜100 を入れる。無ければ流れ・トーン等で代替）",
    criteria || "(指定なし)",
    "",
    "# スタッフのトーク（文字起こし）",
    input.transcript || "(空)",
    "",
    "上記を評価し、指定された JSON のみを出力してください。",
  ].join("\n");
}

/** コードフェンスや前後の余分なテキストを除去して JSON 本体を取り出す。 */
function extractJson(text: string): string {
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t
      .replace(/^```[a-zA-Z]*\s*/, "")
      .replace(/```\s*$/, "")
      .trim();
  }
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    t = t.slice(first, last + 1);
  }
  return t;
}

const toNum = (v: unknown): number =>
  typeof v === "number" && Number.isFinite(v) ? v : 0;
const toStrArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : [];

/** 欠損・型崩れに備えて出力を正規化する。 */
function normalizeOutput(raw: unknown): EvaluationModelOutput {
  const o = (raw ?? {}) as Record<string, unknown>;
  const detail: Record<string, number> = {};
  if (o.scores_detail && typeof o.scores_detail === "object") {
    for (const [k, v] of Object.entries(o.scores_detail as object)) {
      detail[k] = toNum(v);
    }
  }
  return {
    keyword_coverage: toNum(o.keyword_coverage),
    keyword_hits: toStrArr(o.keyword_hits),
    keyword_misses: toStrArr(o.keyword_misses),
    flow_score: toNum(o.flow_score),
    tone_score: toNum(o.tone_score),
    scores_detail: detail,
    total_score: toNum(o.total_score),
    feedback: typeof o.feedback === "string" ? o.feedback : "",
    strengths: toStrArr(o.strengths),
    improvements: toStrArr(o.improvements),
  };
}

/**
 * Claude でトークを評価し、JSON を返す（サーバー専用）。
 * JSON パース前にコードフェンス除去のガードを通し、失敗時は1回だけ再試行する。
 * total_score / keyword_coverage はここでは正規化のみ。重み付き再計算は lib/scoring.ts。
 */
export async function evaluateTranscript(input: {
  scriptBody: string;
  requiredKeywords: string[];
  rubric: Rubric;
  transcript: string;
}): Promise<{ output: EvaluationModelOutput; model: string }> {
  const client = getClient();
  const userPrompt = buildUserPrompt(input);

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    try {
      const parsed = JSON.parse(extractJson(text));
      return { output: normalizeOutput(parsed), model: res.model };
    } catch (e) {
      lastError = e;
    }
  }

  throw new Error(
    `評価結果をJSONとして解釈できませんでした: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  );
}
