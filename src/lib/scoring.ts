import { DEFAULT_RUBRIC_WEIGHTS } from "./constants";
import type { Rubric, RubricWeights } from "./types";

const clamp = (n: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, Number.isFinite(n) ? n : 0));

const round1 = (n: number) => Math.round(n * 10) / 10;

const normalize = (s: string) => s.normalize("NFKC").trim().toLowerCase();

const numOr = (v: unknown, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : fallback;

/** rubric.weights を解決（未指定はデフォルト 40/35/25）。 */
export function resolveWeights(rubric?: Rubric | null): RubricWeights {
  const w = rubric?.weights ?? {};
  return {
    keyword_coverage: numOr(
      w.keyword_coverage,
      DEFAULT_RUBRIC_WEIGHTS.keyword_coverage,
    ),
    flow: numOr(w.flow, DEFAULT_RUBRIC_WEIGHTS.flow),
    tone: numOr(w.tone, DEFAULT_RUBRIC_WEIGHTS.tone),
  };
}

/**
 * キーワード網羅率をサーバー側で再計算する。
 * 母数は script.required_keywords、分子はモデルが hit と判定したうち実在するキーワード。
 * モデルの算出値は信用せず、必須リストを基準に算定する。
 */
export function computeKeywordCoverage(
  requiredKeywords: string[],
  hits: string[],
): number {
  if (!requiredKeywords || requiredKeywords.length === 0) return 100;
  const required = new Set(requiredKeywords.map(normalize));
  const matched = new Set<string>();
  for (const h of hits ?? []) {
    const n = normalize(h);
    if (required.has(n)) matched.add(n);
  }
  return round1((matched.size / required.size) * 100);
}

/**
 * 最終スコアを重みの加重平均で再計算する（モデルの total_score は信用しない）。
 * weights は任意の正数でよく、内部で合計により正規化する。
 */
export function computeTotalScore(
  parts: {
    keyword_coverage: number;
    flow_score: number;
    tone_score: number;
  },
  rubric?: Rubric | null,
): number {
  const w = resolveWeights(rubric);
  const sum = w.keyword_coverage + w.flow + w.tone;
  if (sum <= 0) return 0;
  const total =
    (clamp(parts.keyword_coverage) * w.keyword_coverage +
      clamp(parts.flow_score) * w.flow +
      clamp(parts.tone_score) * w.tone) /
    sum;
  return round1(clamp(total));
}

export { clamp as clampScore, round1 as roundScore };
