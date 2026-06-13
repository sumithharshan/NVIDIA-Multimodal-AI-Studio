import { ProviderChatRequest } from "@/lib/types";

export const runtime = "edge";

type Provider = ProviderChatRequest["provider"];
type Result = { ok: true; response: Response; provider: Provider; model: string } | { ok: false; error: string; status: number };

const ENV_KEYS: Record<Provider, string | undefined> = {
  openai: process.env.OPENAI_API_KEY,
  anthropic: process.env.ANTHROPIC_API_KEY,
  gemini: process.env.GEMINI_API_KEY,
  xai: process.env.XAI_API_KEY,
  nvidia: process.env.NVIDIA_API_KEY,
};

function getKey(provider: Provider, passed?: string) {
  return passed || ENV_KEYS[provider] || "";
}

function textFromContent(content: ProviderChatRequest["messages"][number]["content"]) {
  if (typeof content === "string") return content;
  return content.map((part) => part.type === "text" ? part.text : "[Image attached]").join("\n");
}

function imageParts(content: ProviderChatRequest["messages"][number]["content"]) {
  if (typeof content === "string") return [];
  return content.filter((part) => part.type === "image_url") as Array<{ type: "image_url"; image_url: { url: string } }>;
}

function dataUrlToBase64(dataUrl: string) {
  const match = dataUrl.match(/^data:(.*?);base64,(.*)$/);
  return { mediaType: match?.[1] || "image/png", base64: match?.[2] || dataUrl };
}

function errorResponse(message: string, status = 500) {
  return new Response(message, { status });
}

function parseOpenAISSE(raw: string) {
  const lines = raw.split("\n").filter((line) => line.startsWith("data: "));
  let output = "";
  for (const line of lines) {
    const data = line.replace(/^data: /, "").trim();
    if (!data || data === "[DONE]") continue;
    try { output += JSON.parse(data).choices?.[0]?.delta?.content || ""; } catch {}
  }
  return output;
}

function parseClaudeSSE(raw: string) {
  const lines = raw.split("\n").filter((line) => line.startsWith("data: "));
  let output = "";
  for (const line of lines) {
    const data = line.replace(/^data: /, "").trim();
    if (!data) continue;
    try {
      const json = JSON.parse(data);
      output += json.delta?.text || "";
    } catch {}
  }
  return output;
}

function parseGeminiSSE(raw: string) {
  const lines = raw.split("\n").filter((line) => line.startsWith("data: "));
  let output = "";
  for (const line of lines) {
    const data = line.replace(/^data: /, "").trim();
    if (!data) continue;
    try {
      const json = JSON.parse(data);
      output += json.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("") || "";
    } catch {}
  }
  return output;
}

function textStreamFromSSE(upstream: Response, parser: (raw: string) => string) {
  if (!upstream.body) return errorResponse("No stream received from provider.", 500);
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = upstream.body.getReader();
  const readable = new ReadableStream({
    async start(controller) {
      let carry = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          carry += decoder.decode(value, { stream: true });
          const parts = carry.split("\n\n");
          carry = parts.pop() || "";
          for (const part of parts) {
            const text = parser(part);
            if (text) controller.enqueue(encoder.encode(text));
          }
        }
        const finalText = parser(carry);
        if (finalText) controller.enqueue(encoder.encode(finalText));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(readable, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" } });
}

async function callOpenAICompatible(req: ProviderChatRequest, baseUrl: string, key: string, parser = parseOpenAISSE) {
  const upstream = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: req.model,
      messages: [{ role: "system", content: req.systemPrompt }, ...req.messages],
      temperature: req.temperature,
      max_tokens: req.maxTokens,
      stream: req.stream,
    }),
  });
  if (!upstream.ok) return { ok: false as const, error: await upstream.text(), status: upstream.status };
  if (req.stream) return { ok: true as const, response: textStreamFromSSE(upstream, parser), provider: req.provider, model: req.model };
  const data = await upstream.json();
  return { ok: true as const, response: Response.json({ content: data.choices?.[0]?.message?.content || "" }), provider: req.provider, model: req.model };
}

async function callAnthropic(req: ProviderChatRequest, key: string) {
  const messages = req.messages.map((message) => {
    const blocks: any[] = [];
    const text = textFromContent(message.content);
    if (text) blocks.push({ type: "text", text });
    for (const image of imageParts(message.content)) {
      const { mediaType, base64 } = dataUrlToBase64(image.image_url.url);
      blocks.push({ type: "image", source: { type: "base64", media_type: mediaType, data: base64 } });
    }
    return { role: message.role === "assistant" ? "assistant" : "user", content: blocks };
  });

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: req.model, max_tokens: req.maxTokens, temperature: req.temperature, system: req.systemPrompt, messages, stream: req.stream }),
  });
  if (!upstream.ok) return { ok: false as const, error: await upstream.text(), status: upstream.status };
  if (req.stream) return { ok: true as const, response: textStreamFromSSE(upstream, parseClaudeSSE), provider: req.provider, model: req.model };
  const data = await upstream.json();
  return { ok: true as const, response: Response.json({ content: data.content?.map((p: any) => p.text || "").join("") || "" }), provider: req.provider, model: req.model };
}

async function callGemini(req: ProviderChatRequest, key: string) {
  const contents = req.messages.map((message) => {
    const parts: any[] = [];
    const text = textFromContent(message.content);
    if (text) parts.push({ text });
    for (const image of imageParts(message.content)) {
      const { mediaType, base64 } = dataUrlToBase64(image.image_url.url);
      parts.push({ inline_data: { mime_type: mediaType, data: base64 } });
    }
    return { role: message.role === "assistant" ? "model" : "user", parts };
  });
  const endpoint = req.stream
    ? `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(req.model)}:streamGenerateContent?alt=sse&key=${key}`
    : `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(req.model)}:generateContent?key=${key}`;
  const upstream = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: req.systemPrompt }] },
      contents,
      generationConfig: { temperature: req.temperature, maxOutputTokens: req.maxTokens },
    }),
  });
  if (!upstream.ok) return { ok: false as const, error: await upstream.text(), status: upstream.status };
  if (req.stream) return { ok: true as const, response: textStreamFromSSE(upstream, parseGeminiSSE), provider: req.provider, model: req.model };
  const data = await upstream.json();
  const content = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("") || "";
  return { ok: true as const, response: Response.json({ content }), provider: req.provider, model: req.model };
}

async function callProvider(req: ProviderChatRequest): Promise<Result> {
  const key = getKey(req.provider, req.apiKey);
  if (!key) return { ok: false, error: `Missing ${req.provider} API key. Add it in Settings or .env.local.`, status: 400 };
  if (!req.model) return { ok: false, error: `Missing model for ${req.provider}.`, status: 400 };

  if (req.provider === "openai") return callOpenAICompatible(req, "https://api.openai.com/v1", key);
  if (req.provider === "xai") return callOpenAICompatible(req, "https://api.x.ai/v1", key);
  if (req.provider === "nvidia") return callOpenAICompatible(req, process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1", key);
  if (req.provider === "anthropic") return callAnthropic(req, key);
  return callGemini(req, key);
}

async function attemptWithFallback(body: ProviderChatRequest) {
  const primary = await callProvider(body);
  if (primary.ok || !body.fallbackEnabled) return primary;

  const fallbacks = (body.fallbackProviders || []).filter((item) => item.enabled && item.model && item.provider !== body.provider);
  for (const item of fallbacks) {
    const result = await callProvider({ ...body, provider: item.provider, model: item.model, apiKey: item.apiKey, stream: body.stream });
    if (result.ok) return result;
  }
  return primary;
}

function withProviderHeaders(response: Response, provider: Provider, model: string) {
  const headers = new Headers(response.headers);
  headers.set("x-ai-provider", provider);
  headers.set("x-ai-model", model);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as ProviderChatRequest;
    const result = await attemptWithFallback(body);
    if (!result.ok) return errorResponse(result.error || "Provider request failed.", result.status);
    return withProviderHeaders(result.response, result.provider, result.model);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error.";
    return errorResponse(message, 500);
  }
}
