import { NextResponse } from "next/server";
import { authorizeRecordingAccess } from "@/lib/server/authorize";
import { runEvaluation } from "@/lib/server/evaluate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  let recordingId = "";
  try {
    const body = await req.json();
    recordingId = String(body?.recordingId ?? "");
  } catch {
    return NextResponse.json({ error: "リクエストが不正です。" }, { status: 400 });
  }
  if (!recordingId) {
    return NextResponse.json(
      { error: "recordingId は必須です。" },
      { status: 400 },
    );
  }

  const authz = await authorizeRecordingAccess(recordingId);
  if (!authz.ok) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }

  const result = await runEvaluation(recordingId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ ok: true, evaluationId: result.evaluationId });
}
