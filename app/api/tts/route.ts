import { NVIDIA_BASE_URL } from "@/lib/nvidia";

export const runtime = "nodejs";

function normalizeAudioFromJson(data: any) {
  if (typeof data?.audio === "string") return data.audio.startsWith("data:") ? data.audio : `data:audio/wav;base64,${data.audio}`;
  if (typeof data?.b64_json === "string") return `data:audio/wav;base64,${data.b64_json}`;
  if (typeof data?.audio_base64 === "string") return `data:audio/wav;base64,${data.audio_base64}`;
  if (Array.isArray(data?.data)) {
    const first = data.data[0];
    if (typeof first?.audio === "string") return first.audio.startsWith("data:") ? first.audio : `data:audio/wav;base64,${first.audio}`;
    if (typeof first?.b64_json === "string") return `data:audio/wav;base64,${first.b64_json}`;
  }
  if (typeof data?.url === "string") return data.url;
  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const apiKey = body.apiKey || process.env.NVIDIA_API_KEY;
    const model = body.model || "nvidia/magpie-tts-zeroshot";
    const input = String(body.input || "").trim();
    const voice = body.voice || "Magpie-ZeroShot.Female-1";
    const sampleAudio = body.sampleAudio;

    if (!apiKey) return new Response("Missing NVIDIA API key. Add it in Settings.", { status: 400 });
    if (!input) return new Response("Enter text to convert into speech.", { status: 400 });

    const payload: Record<string, unknown> = {
      model,
      input: input.slice(0, 1000),
      voice,
      response_format: "wav",
    };

    if (sampleAudio) {
      payload.audio = sampleAudio;
      payload.sample_audio = sampleAudio;
      payload.reference_audio = sampleAudio;
    }

    // Hosted NVIDIA speech endpoints are model-specific. The common OpenAI-style
    // path is tried first; if NVIDIA changes the Magpie schema, update this file.
    const upstream = await fetch(`${NVIDIA_BASE_URL}/audio/speech`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!upstream.ok) {
      const errorText = await upstream.text();
      return new Response(errorText || "NVIDIA TTS request failed. Check the Magpie TTS API reference for the latest endpoint schema.", { status: upstream.status });
    }

    const contentType = upstream.headers.get("content-type") || "";
    if (contentType.includes("audio") || contentType.includes("octet-stream")) {
      const arrayBuffer = await upstream.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      return Response.json({ audio: `data:${contentType.includes("audio") ? contentType : "audio/wav"};base64,${base64}`, note: "Generated voice output." });
    }

    const data = await upstream.json();
    const audio = normalizeAudioFromJson(data);
    if (!audio) {
      return new Response("TTS request succeeded but no audio payload was returned. Adjust app/api/tts/route.ts for the exact NVIDIA Magpie response schema.", { status: 500 });
    }

    return Response.json({ audio, note: "Generated voice output." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error.";
    return new Response(message, { status: 500 });
  }
}
