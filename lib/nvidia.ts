import { ModelOption } from "./types";

export const NVIDIA_BASE_URL = process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1";
export const NVIDIA_GENAI_BASE_URL = process.env.NVIDIA_GENAI_BASE_URL || "https://ai.api.nvidia.com/v1/genai";

export const MODEL_OPTIONS: ModelOption[] = [
  {
    id: "moonshotai/kimi-k2.6",
    label: "Kimi K2.6 Multimodal",
    provider: "Moonshot AI",
    description: "Multimodal chat model for text, image reading, reasoning, and tool workflows.",
    capabilities: ["chat", "vision", "tool-calling"],
  },
  {
    id: "moonshotai/kimi-k2.5",
    label: "Kimi K2.5 Multimodal",
    provider: "Moonshot AI",
    description: "Multimodal chat model for image reading and reasoning.",
    capabilities: ["chat", "vision", "tool-calling"],
  },
  {
    id: "qwen/qwen3.5-397b-a17b",
    label: "qwen3.5-397b-a17b",
    provider: "Qwen",
    description: "Vision + chat + RAG capable multimodal model.",
    capabilities: ["chat", "vision", "tool-calling"],
  },
  {
    id: "qwen/qwen3.5-122b-a10b",
    label: "qwen3.5-122b-a10b",
    provider: "Qwen",
    description: "Agent-ready multimodal chat with tool calling.",
    capabilities: ["chat", "vision", "tool-calling"],
  },
  {
    id: "nvidia/nemotron-nano-12b-v2-vl",
    label: "Nemotron Nano 12B v2 VL",
    provider: "NVIDIA",
    description: "Vision-language model for image/document understanding.",
    capabilities: ["chat", "vision"],
  },
  {
    id: "meta/llama-3.3-70b-instruct",
    label: "Llama 3.3 70B Instruct",
    provider: "Meta",
    description: "General chat and reasoning.",
    capabilities: ["chat"],
  },
  {
    id: "nvidia/llama-3.1-nemotron-70b-instruct",
    label: "Nemotron 70B Instruct",
    provider: "NVIDIA",
    description: "General assistant and reasoning.",
    capabilities: ["chat"],
  },
  {
    id: "mistralai/mixtral-8x7b-instruct-v0.1",
    label: "Mixtral 8x7B Instruct",
    provider: "Mistral",
    description: "Fast instruction following.",
    capabilities: ["chat"],
  },
  {
    id: "qwen/qwen2.5-coder-32b-instruct",
    label: "Qwen2.5 Coder 32B",
    provider: "Qwen",
    description: "Strong coding model.",
    capabilities: ["chat", "code"],
  },
  {
    id: "meta/llama-3.1-8b-instruct",
    label: "Llama 3.1 8B Instruct",
    provider: "Meta",
    description: "Lightweight chat model.",
    capabilities: ["chat"],
  },
  {
    id: "nvidia/riva-translate-4b-instruct-v1.1",
    label: "riva-translate-4b-instruct-v1_1",
    provider: "NVIDIA",
    description: "Translation model. Hindi and Sinhala are included in the UI language picker.",
    capabilities: ["chat", "translation"],
  },
  {
    id: "nvidia/magpie-tts-zeroshot",
    label: "magpie-tts-zeroshot",
    provider: "NVIDIA",
    description: "Text-to-speech voice output from text and an optional voice sample.",
    capabilities: ["tts"],
  },
  {
    id: "black-forest-labs/flux.1-dev",
    label: "FLUX.1 Dev",
    provider: "Black Forest Labs",
    description: "Hosted NVIDIA text-to-image endpoint. Recommended for image generation testing.",
    capabilities: ["image-generation"],
  },
  {
    id: "black-forest-labs/flux.1-schnell",
    label: "FLUX.1 Schnell",
    provider: "Black Forest Labs",
    description: "Fast hosted NVIDIA text-to-image endpoint.",
    capabilities: ["image-generation"],
  },
  {
    id: "stabilityai/stable-diffusion-xl",
    label: "Stable Diffusion XL",
    provider: "Stability AI",
    description: "Hosted NVIDIA text-to-image endpoint.",
    capabilities: ["image-generation"],
  },
  {
    id: "stabilityai/stable-diffusion-3-medium",
    label: "Stable Diffusion 3 Medium",
    provider: "Stability AI",
    description: "Hosted NVIDIA image generation endpoint when available on your account.",
    capabilities: ["image-generation"],
  },
  {
    id: "qwen/qwen-image-edit",
    label: "qwen-image-edit",
    provider: "Qwen",
    description: "Qwen image editing model. May require a hosted/free endpoint or self-hosted NIM access.",
    capabilities: ["image-generation", "image-edit", "self-hosted"],
  },
  {
    id: "qwen/qwen-image",
    label: "qwen-image",
    provider: "Qwen",
    description: "Qwen text-to-image model. NVIDIA Build often lists it as downloadable/self-hosted, so hosted API access depends on your account.",
    capabilities: ["image-generation", "self-hosted"],
  },
  {
    id: "qwen/qwen3-next-80b-a3b-instruct",
    label: "qwen3-next-80b-a3b-instruct",
    provider: "Qwen",
    description: "Long-context instruction model.",
    capabilities: ["chat"],
  },
];

export const DEFAULT_MODELS = MODEL_OPTIONS.map((model) => model.id);

export function getModelOption(modelId: string) {
  return MODEL_OPTIONS.find((model) => model.id === modelId);
}

export function supportsVision(modelId: string) {
  return Boolean(getModelOption(modelId)?.capabilities.includes("vision"));
}

export function supportsImageGeneration(modelId: string) {
  return Boolean(getModelOption(modelId)?.capabilities.includes("image-generation"));
}

export function supportsImageEditing(modelId: string) {
  return Boolean(getModelOption(modelId)?.capabilities.includes("image-edit"));
}

export function supportsTranslation(modelId: string) {
  return Boolean(getModelOption(modelId)?.capabilities.includes("translation"));
}

export function supportsTTS(modelId: string) {
  return Boolean(getModelOption(modelId)?.capabilities.includes("tts"));
}

export function requiresSelfHosted(modelId: string) {
  return Boolean(getModelOption(modelId)?.capabilities.includes("self-hosted"));
}

export function getGenAIEndpoint(modelId: string) {
  const [provider, model] = modelId.split("/");
  if (!provider || !model) return null;
  return `${NVIDIA_GENAI_BASE_URL}/${provider}/${model}`;
}
