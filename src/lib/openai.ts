import OpenAI, { toFile } from "openai";

let _client: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY が未設定です。");
    _client = new OpenAI({ apiKey });
  }
  return _client;
}

export const WHISPER_MODEL = process.env.OPENAI_WHISPER_MODEL || "whisper-1";

/** 音声 Blob を日本語で文字起こしする（Whisper, サーバー専用）。 */
export async function transcribeAudio(
  blob: Blob,
  filename: string,
): Promise<string> {
  const client = getOpenAI();
  const file = await toFile(blob, filename, {
    type: blob.type || "audio/webm",
  });
  const res = await client.audio.transcriptions.create({
    file,
    model: WHISPER_MODEL,
    language: "ja",
  });
  return res.text ?? "";
}
