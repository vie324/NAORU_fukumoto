import { createAdminClient } from "@/lib/supabase/admin";
import { transcribeAudio } from "@/lib/openai";
import { RECORDINGS_BUCKET } from "@/lib/constants";
import { toErrorMessage } from "@/lib/errors";
import type { RecordingSegment } from "@/lib/types";

export interface TranscriptionResult {
  ok: boolean;
  transcript?: string;
  error?: string;
}

/**
 * 録音を文字起こしする（service role 使用）。各セグメントを逐次 Whisper にかけ、
 * 既に transcribed のセグメントはスキップ（再実行対応）。すべて成功したら結合して
 * recordings.transcript に保存し status=transcribed。途中失敗は status=error。
 * 認可（テナント/所有権）は呼び出し側で済ませておくこと。
 */
export async function runTranscription(
  recordingId: string,
): Promise<TranscriptionResult> {
  const admin = createAdminClient();

  try {
    await admin
      .from("recordings")
      .update({ status: "transcribing", error_message: null })
      .eq("id", recordingId);

    const { data: segments, error } = await admin
      .from("recording_segments")
      .select("*")
      .eq("recording_id", recordingId)
      .order("seq", { ascending: true });

    if (error) throw error;
    if (!segments || segments.length === 0) {
      throw new Error("文字起こし対象のセグメントがありません。");
    }

    let hadError = false;

    for (const seg of segments as RecordingSegment[]) {
      if (seg.status === "transcribed" && seg.transcript) continue;

      try {
        const { data: blob, error: dlErr } = await admin.storage
          .from(RECORDINGS_BUCKET)
          .download(seg.audio_path);
        if (dlErr || !blob) {
          throw dlErr ?? new Error("音声のダウンロードに失敗しました。");
        }

        const ext = seg.audio_path.split(".").pop() || "webm";
        const text = await transcribeAudio(blob, `seg-${seg.seq}.${ext}`);

        await admin
          .from("recording_segments")
          .update({
            transcript: text,
            status: "transcribed",
            error_message: null,
          })
          .eq("id", seg.id);
      } catch (e) {
        hadError = true;
        await admin
          .from("recording_segments")
          .update({ status: "error", error_message: toErrorMessage(e) })
          .eq("id", seg.id);
      }
    }

    if (hadError) {
      const msg = "一部セグメントの文字起こしに失敗しました。";
      await admin
        .from("recordings")
        .update({ status: "error", error_message: msg })
        .eq("id", recordingId);
      return { ok: false, error: msg };
    }

    // seq 順に結合（スキップ分も含め最新を取り直す）。
    const { data: done } = await admin
      .from("recording_segments")
      .select("seq,transcript")
      .eq("recording_id", recordingId)
      .order("seq", { ascending: true });

    const transcript = (done ?? [])
      .map((d) => (d.transcript ?? "").trim())
      .filter(Boolean)
      .join("\n")
      .trim();

    await admin
      .from("recordings")
      .update({ transcript, status: "transcribed", error_message: null })
      .eq("id", recordingId);

    return { ok: true, transcript };
  } catch (e) {
    const msg = toErrorMessage(e);
    await admin
      .from("recordings")
      .update({ status: "error", error_message: msg })
      .eq("id", recordingId);
    return { ok: false, error: msg };
  }
}
