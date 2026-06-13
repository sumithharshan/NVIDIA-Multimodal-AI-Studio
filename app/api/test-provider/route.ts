import { ProviderChatRequest } from "@/lib/types";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const origin = new URL(request.url).origin;
    const payload: ProviderChatRequest = {
      provider: body.provider,
      model: body.model,
      apiKey: body.apiKey,
      messages: [{ role: "user", content: "Reply with OK only." }],
      systemPrompt: "You are a connection test assistant. Reply with OK only.",
      temperature: 0,
      maxTokens: 20,
      stream: false,
    };
    const response = await fetch(`${origin}/api/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!response.ok) return new Response(await response.text(), { status: response.status });
    return Response.json({ ok: true });
  } catch (error) {
    return new Response(error instanceof Error ? error.message : "Test failed.", { status: 500 });
  }
}
