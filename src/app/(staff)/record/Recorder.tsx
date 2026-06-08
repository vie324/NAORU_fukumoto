"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  AUDIO_BITS_PER_SECOND,
  RECORDING_SEGMENT_SEC,
  RECORDINGS_BUCKET,
} from "@/lib/constants";
import { formatDuration } from "@/lib/format";
import { categoryLabel } from "@/lib/labels";
import { toErrorMessage } from "@/lib/errors";
import type { ScriptCategory } from "@/lib/types";

interface ScriptOption {
  id: string;
  title: string;
  category: ScriptCategory;
}

interface SegmentInfo {
  seq: number;
  blob: Blob;
  durationSec: number;
  url: string;
}

function ProcLine({
  label,
  state,
}: {
  label: string;
  state: "idle" | "active" | "done";
}) {
  return (
    <li className="flex items-center gap-2">
      {state === "done" ? (
        <span className="text-emerald-600">✓</span>
      ) : state === "active" ? (
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-brand" />
      ) : (
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
      )}
      <span
        className={
          state === "idle"
            ? "text-slate-400"
            : state === "active"
              ? "font-medium text-slate-800"
              : "text-slate-600"
        }
      >
        {label}
        {state === "active" && "中…"}
      </span>
    </li>
  );
}

type Phase =
  | "idle"
  | "recording"
  | "recorded"
  | "submitting"
  | "processing"
  | "done";

type ProcStep = "transcribing" | "evaluating" | "done" | "error";

/** 対応する mimeType を優先順に探す。 */
function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

function mimeToExt(mime: string): string {
  const base = mime.split(";")[0];
  if (base.includes("webm")) return "webm";
  if (base.includes("mp4")) return "mp4";
  if (base.includes("ogg")) return "ogg";
  return "dat";
}

export function Recorder({
  scripts,
  staffId,
  tenantId,
  storeId,
}: {
  scripts: ScriptOption[];
  staffId: string;
  tenantId: string;
  storeId: string | null;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [scriptId, setScriptId] = useState<string>(scripts[0]?.id ?? "");
  const [elapsed, setElapsed] = useState(0);
  const [segments, setSegments] = useState<SegmentInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);
  const [procStep, setProcStep] = useState<ProcStep>("transcribing");
  const [procError, setProcError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const segmentsRef = useRef<SegmentInfo[]>([]);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);
  const segSecRef = useRef(0);
  const pendingDurRef = useRef(0);
  const continueRef = useRef(false);
  const mimeRef = useRef("");

  useEffect(() => {
    setSupported(
      typeof MediaRecorder !== "undefined" &&
        typeof navigator !== "undefined" &&
        !!navigator.mediaDevices,
    );
  }, []);

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // アンマウント時の後始末。
  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      cleanupStream();
      segmentsRef.current.forEach((s) => URL.revokeObjectURL(s.url));
    };
  }, [cleanupStream]);

  const startRecorder = useCallback(() => {
    chunksRef.current = [];
    const mr = new MediaRecorder(streamRef.current!, {
      mimeType: mimeRef.current || undefined,
      audioBitsPerSecond: AUDIO_BITS_PER_SECOND,
    });
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    mr.onstop = () => {
      const type = mimeRef.current || chunksRef.current[0]?.type || "audio/webm";
      const blob = new Blob(chunksRef.current, { type });
      const seq = segmentsRef.current.length;
      const info: SegmentInfo = {
        seq,
        blob,
        durationSec: Math.max(1, pendingDurRef.current),
        url: URL.createObjectURL(blob),
      };
      segmentsRef.current = [...segmentsRef.current, info];
      setSegments(segmentsRef.current);

      if (continueRef.current) {
        startRecorder(); // 次セグメントを開始（長尺分割）
      } else {
        cleanupStream();
        setPhase("recorded");
      }
    };
    mr.start();
    recorderRef.current = mr;
  }, [cleanupStream]);

  const start = useCallback(async () => {
    setError(null);
    if (!scriptId) {
      setError("スクリプトを選択してください。");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      mimeRef.current = pickMimeType();

      // 状態リセット
      segmentsRef.current.forEach((s) => URL.revokeObjectURL(s.url));
      segmentsRef.current = [];
      setSegments([]);
      elapsedRef.current = 0;
      segSecRef.current = 0;
      setElapsed(0);
      continueRef.current = true;
      setSubmittedId(null);

      startRecorder();
      setPhase("recording");

      tickRef.current = setInterval(() => {
        elapsedRef.current += 1;
        segSecRef.current += 1;
        setElapsed(elapsedRef.current);
        // セグメント境界に達したらローテーション（停止→新規開始）。
        if (segSecRef.current >= RECORDING_SEGMENT_SEC) {
          pendingDurRef.current = segSecRef.current;
          segSecRef.current = 0;
          recorderRef.current?.stop();
        }
      }, 1000);
    } catch {
      setError(
        "マイクにアクセスできませんでした。ブラウザのマイク許可をご確認ください。",
      );
      cleanupStream();
      setPhase("idle");
    }
  }, [scriptId, startRecorder, cleanupStream]);

  const stop = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    continueRef.current = false;
    pendingDurRef.current = segSecRef.current;
    segSecRef.current = 0;
    recorderRef.current?.stop(); // onstop が finalize する
  }, []);

  const reset = useCallback(() => {
    segmentsRef.current.forEach((s) => URL.revokeObjectURL(s.url));
    segmentsRef.current = [];
    setSegments([]);
    elapsedRef.current = 0;
    setElapsed(0);
    setError(null);
    setSubmittedId(null);
    setPhase("idle");
  }, []);

  // 文字起こし→評価のパイプラインを順次実行。失敗時は再実行できるようにする。
  const runPipeline = useCallback(async (recordingId: string) => {
    setPhase("processing");
    setProcError(null);
    try {
      setProcStep("transcribing");
      const tr = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ recordingId }),
      });
      if (!tr.ok) {
        const j = (await tr.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "文字起こしに失敗しました。");
      }

      setProcStep("evaluating");
      const ev = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ recordingId }),
      });
      if (!ev.ok) {
        const j = (await ev.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "評価に失敗しました。");
      }

      setProcStep("done");
      setPhase("done");
    } catch (e) {
      setProcError(toErrorMessage(e));
      setProcStep("error");
    }
  }, []);

  const submit = useCallback(async () => {
    if (segmentsRef.current.length === 0) return;
    setPhase("submitting");
    setError(null);
    const supabase = createClient();
    // 実際に録音された Blob の MIME を優先（iPad/Safari の mp4 等を正しく扱う）。
    const effectiveMime =
      mimeRef.current || segmentsRef.current[0]?.blob.type || "audio/webm";
    const ext = mimeToExt(effectiveMime);
    const contentType = effectiveMime;

    try {
      const { data: rec, error: recErr } = await supabase
        .from("recordings")
        .insert({
          tenant_id: tenantId,
          store_id: storeId,
          staff_id: staffId,
          script_id: scriptId,
          status: "uploaded",
          duration_sec: elapsedRef.current,
        })
        .select("id")
        .single();
      if (recErr || !rec) throw recErr ?? new Error("録音レコードの作成に失敗");

      const recordingId = rec.id as string;

      for (const seg of segmentsRef.current) {
        const path = `${tenantId}/${recordingId}/${seg.seq}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from(RECORDINGS_BUCKET)
          .upload(path, seg.blob, { contentType, upsert: true });
        if (upErr) throw upErr;

        const { error: segErr } = await supabase
          .from("recording_segments")
          .insert({
            recording_id: recordingId,
            tenant_id: tenantId,
            seq: seg.seq,
            audio_path: path,
            duration_sec: seg.durationSec,
            status: "pending",
          });
        if (segErr) throw segErr;
      }

      await supabase
        .from("recordings")
        .update({ audio_path: `${tenantId}/${recordingId}/0.${ext}` })
        .eq("id", recordingId);

      setSubmittedId(recordingId);
      await runPipeline(recordingId);
    } catch (e) {
      console.error(e);
      setError(
        "提出に失敗しました。通信状況を確認してもう一度お試しください。",
      );
      setPhase("recorded");
    }
  }, [scriptId, staffId, tenantId, storeId, runPipeline]);

  if (!supported) {
    return (
      <div className="card">
        <p className="text-sm text-red-700">
          このブラウザは録音に対応していません。Safari / Chrome の最新版をお使いください。
        </p>
      </div>
    );
  }

  if (scripts.length === 0) {
    return (
      <div className="card">
        <p className="text-sm text-slate-600">
          評価対象のスクリプトがまだありません。管理者にスクリプト登録を依頼してください。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="card space-y-4">
        <div>
          <label className="label" htmlFor="script">
            スクリプトを選択
          </label>
          <select
            id="script"
            className="input"
            value={scriptId}
            onChange={(e) => setScriptId(e.target.value)}
            disabled={phase === "recording" || phase === "submitting"}
          >
            {scripts.map((s) => (
              <option key={s.id} value={s.id}>
                [{categoryLabel(s.category)}] {s.title}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
          <div className="font-mono text-2xl tabular-nums">
            {formatDuration(elapsed)}
          </div>
          <div className="flex items-center gap-2">
            {phase === "recording" && (
              <span className="flex items-center gap-1.5 text-sm text-red-600">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-600" />
                録音中
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {phase === "idle" && (
            <button className="btn-primary px-6 py-3 text-base" onClick={start}>
              録音開始
            </button>
          )}
          {phase === "recording" && (
            <button className="btn-danger px-6 py-3 text-base" onClick={stop}>
              録音停止
            </button>
          )}
          {(phase === "recorded" || phase === "submitting") && (
            <>
              <button
                className="btn-primary px-6 py-3 text-base"
                onClick={submit}
                disabled={phase === "submitting"}
              >
                {phase === "submitting" ? "提出中…" : "提出する"}
              </button>
              <button
                className="btn-secondary px-6 py-3 text-base"
                onClick={reset}
                disabled={phase === "submitting"}
              >
                録り直す
              </button>
            </>
          )}
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {RECORDING_SEGMENT_SEC > 0 && (
          <p className="text-xs text-slate-400">
            長尺の録音は約 {Math.round(RECORDING_SEGMENT_SEC / 60)}{" "}
            分ごとに自動で分割して保存します。
          </p>
        )}
      </div>

      {segments.length > 0 && (phase === "recorded" || phase === "submitting") && (
        <div className="card space-y-3">
          <h2 className="text-sm font-semibold text-slate-700">
            プレビュー（{segments.length} セグメント / 合計{" "}
            {formatDuration(elapsed)}）
          </h2>
          <div className="space-y-2">
            {segments.map((s) => (
              <div key={s.seq} className="flex items-center gap-3">
                <span className="w-20 shrink-0 text-xs text-slate-500">
                  セグメント {s.seq + 1}
                </span>
                <audio controls src={s.url} className="h-9 w-full" />
              </div>
            ))}
          </div>
        </div>
      )}

      {phase === "processing" && (
        <div className="card space-y-4">
          <p className="text-sm font-medium text-slate-700">
            提出しました。処理を行っています…
          </p>
          <ol className="space-y-2 text-sm">
            <ProcLine
              label="文字起こし"
              state={
                procStep === "transcribing"
                  ? "active"
                  : procStep === "error"
                    ? "idle"
                    : "done"
              }
            />
            <ProcLine
              label="評価"
              state={
                procStep === "evaluating"
                  ? "active"
                  : procStep === "done"
                    ? "done"
                    : "idle"
              }
            />
          </ol>
          {procError && (
            <div className="space-y-2">
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {procError}
              </p>
              <button
                className="btn-secondary px-4 py-2 text-sm"
                onClick={() => submittedId && runPipeline(submittedId)}
              >
                処理を再実行する
              </button>
            </div>
          )}
        </div>
      )}

      {phase === "done" && (
        <div className="card space-y-3 border-emerald-200 bg-emerald-50">
          <p className="font-medium text-emerald-800">
            評価が完了しました。
          </p>
          <div className="flex gap-3">
            {submittedId && (
              <Link
                href={`/history/${submittedId}`}
                className="btn-primary px-4 py-2 text-sm"
              >
                結果を見る
              </Link>
            )}
            <button className="btn-secondary px-4 py-2 text-sm" onClick={reset}>
              続けて録音する
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
