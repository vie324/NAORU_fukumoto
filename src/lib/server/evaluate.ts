import { createAdminClient } from "@/lib/supabase/admin";
import { evaluateTranscript } from "@/lib/anthropic";
import {
  computeKeywordCoverage,
  computeTotalScore,
  clampScore,
} from "@/lib/scoring";
import { toErrorMessage } from "@/lib/errors";
import type { Rubric } from "@/lib/types";

export interface EvaluationResult {
  ok: boolean;
  evaluationId?: string;
  error?: string;
}

const normalize = (s: string) => s.normalize("NFKC").trim().toLowerCase();

/**
 * 録音を Claude で評価し、evaluations を作成する（service role 使用）。
 * total_score と keyword_coverage はモデル値を信用せず lib/scoring.ts で再計算する。
 * 認可（テナント/所有権）は呼び出し側で済ませておくこと。
 */
export async function runEvaluation(
  recordingId: string,
): Promise<EvaluationResult> {
  const admin = createAdminClient();

  try {
    const { data: rec, error: recErr } = await admin
      .from("recordings")
      .select("*")
      .eq("id", recordingId)
      .single();
    if (recErr || !rec) throw new Error("録音が見つかりません。");
    if (!rec.transcript || !rec.transcript.trim()) {
      throw new Error(
        "文字起こし結果がありません。先に文字起こしを実行してください。",
      );
    }

    await admin
      .from("recordings")
      .update({ status: "evaluating", error_message: null })
      .eq("id", recordingId);

    const { data: script, error: scriptErr } = await admin
      .from("scripts")
      .select("*")
      .eq("id", rec.script_id)
      .single();
    if (scriptErr || !script) throw new Error("スクリプトが見つかりません。");

    const requiredKeywords = (script.required_keywords ?? []) as string[];
    const rubric = (script.rubric ?? {}) as Rubric;

    const { output, model } = await evaluateTranscript({
      scriptBody: script.body ?? "",
      requiredKeywords,
      rubric,
      transcript: rec.transcript,
    });

    // hits/misses は required_keywords を基準にサーバー側で確定する。
    const hitSet = new Set(output.keyword_hits.map(normalize));
    const hits = requiredKeywords.filter((k) => hitSet.has(normalize(k)));
    const misses = requiredKeywords.filter((k) => !hitSet.has(normalize(k)));

    // スコアはサーバー側で再計算（モデルの算術は信用しない）。
    const keywordCoverage = computeKeywordCoverage(
      requiredKeywords,
      output.keyword_hits,
    );
    const flowScore = clampScore(output.flow_score);
    const toneScore = clampScore(output.tone_score);
    const totalScore = computeTotalScore(
      {
        keyword_coverage: keywordCoverage,
        flow_score: flowScore,
        tone_score: toneScore,
      },
      rubric,
    );

    const { data: ev, error: evErr } = await admin
      .from("evaluations")
      .insert({
        recording_id: recordingId,
        tenant_id: rec.tenant_id,
        total_score: totalScore,
        keyword_coverage: keywordCoverage,
        flow_score: flowScore,
        tone_score: toneScore,
        scores_detail: output.scores_detail,
        keyword_hits: hits,
        keyword_misses: misses,
        feedback: output.feedback,
        strengths: output.strengths,
        improvements: output.improvements,
        model,
      })
      .select("id")
      .single();
    if (evErr || !ev) throw evErr ?? new Error("評価結果の保存に失敗しました。");

    await admin
      .from("recordings")
      .update({ status: "evaluated", error_message: null })
      .eq("id", recordingId);

    return { ok: true, evaluationId: ev.id as string };
  } catch (e) {
    const msg = toErrorMessage(e);
    await admin
      .from("recordings")
      .update({ status: "error", error_message: msg })
      .eq("id", recordingId);
    return { ok: false, error: msg };
  }
}
