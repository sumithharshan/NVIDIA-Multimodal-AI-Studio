import { ModelInfo, ProviderId } from "./types";

export const PROVIDER_LABELS: Record<Exclude<ProviderId, "auto">, string> = {
  openai: "OpenAI",
  anthropic: "Claude",
  gemini: "Gemini",
  xai: "Grok / xAI",
  nvidia: "NVIDIA",
};

export const PROVIDER_COLORS: Record<ProviderId, string> = {
  auto: "border-slate-400/20 bg-slate-400/10 text-slate-200",
  openai: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
  anthropic: "border-orange-400/20 bg-orange-400/10 text-orange-200",
  gemini: "border-sky-400/20 bg-sky-400/10 text-sky-200",
  xai: "border-zinc-400/20 bg-zinc-400/10 text-zinc-200",
  nvidia: "border-lime-400/20 bg-lime-400/10 text-lime-200",
};

export const MODELS: ModelInfo[] = [
  { id: "gpt-4.1", label: "GPT-4.1", provider: "openai", description: "Strong general, coding, and multimodal model.", capabilities: ["chat", "code", "vision", "reasoning"], recommended: true },
  { id: "gpt-4.1-mini", label: "GPT-4.1 Mini", provider: "openai", description: "Fast and cost-efficient OpenAI model.", capabilities: ["chat", "code", "vision", "fast"] },
  { id: "gpt-4o", label: "GPT-4o", provider: "openai", description: "Multimodal chat and vision model.", capabilities: ["chat", "vision", "fast"] },
  { id: "gpt-4o-mini", label: "GPT-4o Mini", provider: "openai", description: "Fast lightweight multimodal model.", capabilities: ["chat", "vision", "fast"] },

  { id: "claude-sonnet-4-5", label: "Claude Sonnet 4.5", provider: "anthropic", description: "Excellent for writing, coding, and document-heavy tasks.", capabilities: ["chat", "code", "vision", "long-context", "reasoning"], recommended: true },
  { id: "claude-haiku-4-5", label: "Claude Haiku 4.5", provider: "anthropic", description: "Fast Claude model for daily work.", capabilities: ["chat", "vision", "fast"] },
  { id: "claude-opus-4-1", label: "Claude Opus 4.1", provider: "anthropic", description: "High-end Claude reasoning model.", capabilities: ["chat", "code", "vision", "long-context", "reasoning"] },

  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", provider: "gemini", description: "Large-context reasoning and multimodal model.", capabilities: ["chat", "vision", "long-context", "reasoning"], recommended: true },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "gemini", description: "Fast multimodal model.", capabilities: ["chat", "vision", "fast"] },
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", provider: "gemini", description: "Fast general Gemini model.", capabilities: ["chat", "vision", "fast"] },

  { id: "grok-4", label: "Grok 4", provider: "xai", description: "xAI general reasoning and chat model.", capabilities: ["chat", "reasoning"], recommended: true },
  { id: "grok-4-fast", label: "Grok 4 Fast", provider: "xai", description: "Fast Grok model.", capabilities: ["chat", "fast"] },
  { id: "grok-code-fast-1", label: "Grok Code Fast", provider: "xai", description: "Coding-focused Grok model.", capabilities: ["chat", "code", "fast"] },

  { id: "meta/llama-3.3-70b-instruct", label: "Llama 3.3 70B", provider: "nvidia", description: "NVIDIA hosted open model for general chat.", capabilities: ["chat"] },
  { id: "nvidia/llama-3.1-nemotron-70b-instruct", label: "Nemotron 70B", provider: "nvidia", description: "NVIDIA assistant and reasoning model.", capabilities: ["chat", "reasoning"], recommended: true },
  { id: "qwen/qwen2.5-coder-32b-instruct", label: "Qwen Coder 32B", provider: "nvidia", description: "NVIDIA-hosted coding model.", capabilities: ["chat", "code"] },
  { id: "qwen/qwen3.5-397b-a17b", label: "Qwen 3.5 397B VL", provider: "nvidia", description: "NVIDIA multimodal model, if available on your account.", capabilities: ["chat", "vision", "reasoning"] },
  { id: "moonshotai/kimi-k2.6", label: "Kimi K2.6", provider: "nvidia", description: "Kimi multimodal model, if available on your NVIDIA endpoint.", capabilities: ["chat", "vision", "long-context", "reasoning"] },
];

export function modelsForProvider(provider: Exclude<ProviderId, "auto">) {
  return MODELS.filter((model) => model.provider === provider);
}

export function modelById(provider: Exclude<ProviderId, "auto">, id: string) {
  return MODELS.find((model) => model.provider === provider && model.id === id);
}

export function supportsVision(provider: Exclude<ProviderId, "auto">, model: string) {
  return Boolean(modelById(provider, model)?.capabilities.includes("vision"));
}
