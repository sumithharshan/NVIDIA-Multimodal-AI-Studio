import { NVIDIA_BASE_URL, NVIDIA_GENAI_BASE_URL, getGenAIEndpoint } from "@/lib/nvidia";

export const runtime = "edge";

type Attempt = {
  name: string;
  url: string;
  payload: Record<string, unknown>;
};

function stripDataUrlPrefix(value: string) {
  return value.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
}

function asDataUrl(value: string) {
  if (!value) return null;
  if (value.startsWith("data:image/")) return value;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return `data:image/png;base64,${value}`;
}

function normalizeImageOutputs(data: any): string[] {
  const images: string[] = [];

  function push(value: unknown) {
    if (typeof value !== "string" || !value) return;
    const normalized = asDataUrl(value);
    if (normalized) images.push(normalized);
  }

  if (Array.isArray(data?.data)) {
    for (const item of data.data) {
      push(item?.b64_json);
      push(item?.url);
      push(item?.image_url);
      push(item?.image_base64);
      push(item?.base64);
    }
  }

  if (Array.isArray(data?.artifacts)) {
    for (const item of data.artifacts) {
      push(item?.base64);
      push(item?.b64_json);
      push(item?.url);
      push(item?.image);
    }
  }

  if (Array.isArray(data?.images)) {
    for (const item of data.images) {
      if (typeof item === "string") push(item);
      else {
        push(item?.base64);
        push(item?.b64_json);
        push(item?.url);
        push(item?.image);
      }
    }
  }

  push(data?.image);
  push(data?.image_base64);
  push(data?.b64_json);
  push(data?.url);
  push(data?.output?.image);
  push(data?.output?.image_base64);

  return Array.from(new Set(images));
}

function buildAttempts(model: string, prompt: string, edit: boolean, images: string[]): Attempt[] {
  const genaiEndpoint = getGenAIEndpoint(model);
  const firstImage = images[0];
  const attempts: Attempt[] = [];

  if (model.startsWith("black-forest-labs/flux.")) {
    attempts.push({
      name: "NVIDIA GenAI FLUX endpoint",
      url: genaiEndpoint || `${NVIDIA_GENAI_BASE_URL}/${model}`,
      payload: {
        prompt,
        height: 1024,
        width: 1024,
        cfg_scale: 5,
        mode: firstImage && edit ? "canny" : "base",
        image: firstImage || null,
        samples: 1,
        seed: 0,
        steps: model.includes("schnell") ? 4 : 30,
      },
    });
  }

  if (model.startsWith("stabilityai/stable-diffusion")) {
    attempts.push({
      name: "NVIDIA GenAI Stability endpoint",
      url: genaiEndpoint || `${NVIDIA_GENAI_BASE_URL}/${model}`,
      payload: {
        text_prompts: [{ text: prompt, weight: 1 }],
        cfg_scale: 5,
        sampler: "K_DPM_2_ANCESTRAL",
        samples: 1,
        seed: 0,
        steps: 25,
        style_preset: "none",
      },
    });
  }

  if (model.startsWith("qwen/")) {
    attempts.push({
      name: "NVIDIA GenAI Qwen endpoint",
      url: genaiEndpoint || `${NVIDIA_GENAI_BASE_URL}/${model}`,
      payload: edit && firstImage ? {
        prompt,
        image: firstImage,
        images,
        width: 1024,
        height: 1024,
        samples: 1,
      } : {
        prompt,
        width: 1024,
        height: 1024,
        samples: 1,
      },
    });
  }

  attempts.push({
    name: "OpenAI-compatible image endpoint",
    url: `${NVIDIA_BASE_URL}/images/generations`,
    payload: {
      model,
      prompt,
      size: "1024x1024",
      n: 1,
      response_format: "b64_json",
    },
  });

  if (edit && firstImage) {
    attempts.push({
      name: "OpenAI-compatible image edit endpoint",
      url: `${NVIDIA_BASE_URL}/images/edits`,
      payload: {
        model,
        prompt,
        image: firstImage,
        size: "1024x1024",
        n: 1,
        response_format: "b64_json",
      },
    });
  }

  return attempts;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const apiKey = body.apiKey || process.env.NVIDIA_API_KEY;
    const model = body.model;
    const prompt = body.prompt;
    const images = Array.isArray(body.images) ? body.images.filter(Boolean) : [];
    const edit = Boolean(body.edit);
    const testOnly = Boolean(body.testOnly);

    if (!apiKey) return new Response("Missing NVIDIA API key. Add it in Settings.", { status: 400 });
    if (!model) return new Response("Missing model ID.", { status: 400 });

    if (testOnly) {
      const probe = await fetch(`${NVIDIA_BASE_URL}/models`, { headers: { Authorization: `Bearer ${apiKey}` } });
      if (!probe.ok) return new Response(await probe.text(), { status: probe.status });
      return Response.json({ ok: true, note: "NVIDIA API key is valid. Image generation will use the selected model endpoint when you generate." });
    }

    if (!prompt?.trim()) return new Response("Enter a prompt for image generation.", { status: 400 });

    const cleanedImages = images.map((image: string) => image.startsWith("data:image/") ? image : asDataUrl(image)).filter(Boolean) as string[];
    const attempts = buildAttempts(model, prompt, edit, cleanedImages);
    const errors: string[] = [];

    for (const attempt of attempts) {
      try {
        const upstream = await fetch(attempt.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(attempt.payload),
        });

        const text = await upstream.text();
        let data: any = null;
        try { data = text ? JSON.parse(text) : null; } catch { data = null; }

        if (!upstream.ok) {
          errors.push(`${attempt.name} (${upstream.status}): ${text.slice(0, 500)}`);
          continue;
        }

        const normalized = normalizeImageOutputs(data);
        if (normalized.length) {
          return Response.json({ images: normalized, raw: data, endpoint: attempt.name });
        }

        errors.push(`${attempt.name}: request succeeded but no image field was found. Response: ${text.slice(0, 500)}`);
      } catch (error) {
        errors.push(`${attempt.name}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    const qwenNote = model.startsWith("qwen/qwen-image")
      ? " Note: NVIDIA Build may list qwen-image as Downloadable/self-hosted instead of hosted. For hosted image generation, try black-forest-labs/flux.1-dev or stabilityai/stable-diffusion-xl from the model dropdown."
      : "";

    return new Response(`Image generation failed for ${model}.${qwenNote}\n\nTried:\n${errors.join("\n\n")}`, { status: 500 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error.";
    return new Response(message, { status: 500 });
  }
}
