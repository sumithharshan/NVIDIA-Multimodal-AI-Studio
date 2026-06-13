import { NVIDIA_BASE_URL } from "@/lib/nvidia";

export const runtime = "edge";

type IncomingMessage = {
  role: "user" | "assistant" | "system";
  content: unknown;
};

function cleanMessages(messages: IncomingMessage[]) {
  return messages
    .filter((message) => message.role !== "system")
    .map((message) => ({ role: message.role, content: message.content }))
    .slice(-20);
}

function parseSSEChunk(raw: string) {
  const lines = raw.split("\n").filter((line) => line.startsWith("data: "));
  let output = "";

  for (const line of lines) {
    const data = line.replace(/^data: /, "").trim();
    if (!data || data === "[DONE]") continue;
    try {
      const json = JSON.parse(data);
      output += json.choices?.[0]?.delta?.content || "";
    } catch {
      // Ignore malformed partial chunks.
    }
  }

  return output;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const apiKey = body.apiKey || process.env.NVIDIA_API_KEY;
    const model = body.model;
    const messages = cleanMessages(body.messages || []);
    const systemPrompt = body.systemPrompt || "You are a helpful AI assistant.";
    const temperature = Number(body.temperature ?? 0.6);
    const maxTokens = Number(body.maxTokens ?? 1200);
    const stream = Boolean(body.stream);

    if (!apiKey) {
      return new Response("Missing NVIDIA API key. Add it in Settings.", { status: 400 });
    }

    if (!model) {
      return new Response("Missing model ID.", { status: 400 });
    }

    const upstream = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        temperature,
        max_tokens: maxTokens,
        stream,
      }),
    });

    if (!upstream.ok) {
      const errorText = await upstream.text();
      return new Response(errorText || "NVIDIA API request failed.", { status: upstream.status });
    }

    if (!stream) {
      const data = await upstream.json();
      return Response.json({ content: data.choices?.[0]?.message?.content || "" });
    }

    if (!upstream.body) {
      return new Response("No stream received from NVIDIA API.", { status: 500 });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const reader = upstream.body.getReader();

    const readable = new ReadableStream({
      async start(controller) {
        let carry = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          carry += decoder.decode(value, { stream: true });
          const parts = carry.split("\n\n");
          carry = parts.pop() || "";
          for (const part of parts) {
            const text = parseSSEChunk(part);
            if (text) controller.enqueue(encoder.encode(text));
          }
        }
        const finalText = parseSSEChunk(carry);
        if (finalText) controller.enqueue(encoder.encode(finalText));
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error.";
    return new Response(message, { status: 500 });
  }
}
