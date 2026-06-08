// ──────────────────────────────────────────────────────────────
// DB と対応する共有型。Supabase のスキーマ（supabase/migrations）と一致させる。
// ──────────────────────────────────────────────────────────────

export type Role = "admin" | "staff";

export type ScriptCategory = "counseling" | "closing" | "objection" | "other";

export type RecordingStatus =
  | "uploaded"
  | "transcribing"
  | "transcribed"
  | "evaluating"
  | "evaluated"
  | "error";

export type SegmentStatus = "pending" | "transcribed" | "error";

export interface Tenant {
  id: string;
  name: string;
  created_at: string;
}

export interface Store {
  id: string;
  tenant_id: string;
  name: string;
  created_at: string;
}

export interface Profile {
  id: string;
  tenant_id: string;
  store_id: string | null;
  display_name: string;
  role: Role;
  created_at: string;
}

/** rubric.weights は最終スコアの加重平均の重み（合計が任意の正数でよい。内部で正規化）。 */
export interface RubricWeights {
  keyword_coverage: number;
  flow: number;
  tone: number;
}

/** scripts.rubric の構造。weights 未指定時はデフォルト（40/35/25）を使用。 */
export interface Rubric {
  weights?: Partial<RubricWeights>;
  /** モデルが scores_detail で定性評価する追加観点（総合点には直接含めない）。 */
  criteria?: { name: string; description?: string }[];
}

export interface Script {
  id: string;
  tenant_id: string;
  title: string;
  category: ScriptCategory;
  body: string;
  required_keywords: string[];
  rubric: Rubric;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Recording {
  id: string;
  tenant_id: string;
  store_id: string | null;
  staff_id: string;
  script_id: string;
  audio_path: string | null;
  duration_sec: number | null;
  transcript: string | null;
  status: RecordingStatus;
  error_message: string | null;
  created_at: string;
}

export interface RecordingSegment {
  id: string;
  recording_id: string;
  tenant_id: string;
  seq: number;
  audio_path: string;
  duration_sec: number | null;
  transcript: string | null;
  status: SegmentStatus;
  error_message: string | null;
  created_at: string;
}

export interface Evaluation {
  id: string;
  recording_id: string;
  tenant_id: string;
  total_score: number;
  keyword_coverage: number;
  flow_score: number;
  tone_score: number;
  scores_detail: Record<string, number>;
  keyword_hits: string[];
  keyword_misses: string[];
  feedback: string;
  strengths: string[];
  improvements: string[];
  model: string;
  created_at: string;
}

/** Claude が返すべき評価 JSON の形（total_score はサーバーで再計算するため参考値）。 */
export interface EvaluationModelOutput {
  keyword_coverage: number;
  keyword_hits: string[];
  keyword_misses: string[];
  flow_score: number;
  tone_score: number;
  scores_detail: Record<string, number>;
  total_score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
}
