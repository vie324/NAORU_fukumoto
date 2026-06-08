import type { RubricWeights } from "./types";

/** rubric.weights 未指定時に使うデフォルトの重み（仕様: 40/35/25）。 */
export const DEFAULT_RUBRIC_WEIGHTS: RubricWeights = {
  keyword_coverage: 40,
  flow: 35,
  tone: 25,
};

/** Storage バケット名（非公開）。 */
export const RECORDINGS_BUCKET = "recordings";

/** Whisper のファイルサイズ上限（25MB）。これを超えないようセグメント分割する。 */
export const WHISPER_MAX_BYTES = 25 * 1024 * 1024;

/** 1セグメントの目安長（秒）。長尺は複数セグメントに分割して逐次文字起こしする。 */
export const RECORDING_SEGMENT_SEC = Number(
  process.env.NEXT_PUBLIC_RECORDING_SEGMENT_SEC ?? "300",
);

/** 録音時のエンコード設定（モノラル・低ビットレートでファイルを小さく保つ）。 */
export const AUDIO_BITS_PER_SECOND = 48_000;

/** 評価モデル（Sonnet 系想定。現行 Sonnet を既定、env で上書き可）。 */
export const ANTHROPIC_MODEL =
  process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
