import { AppSettings, ProviderId, UploadedContextFile } from "./types";
import { selectedModel } from "./storage";

type Provider = Exclude<ProviderId, "auto">;

export function pickProvider(settings: AppSettings, message: string, files: UploadedContextFile[]): Provider {
  if (settings.activeProvider !== "auto" && settings.providers[settings.activeProvider].enabled) return settings.activeProvider;

  const text = message.toLowerCase();
  const hasImage = files.some((file) => file.dataUrl?.startsWith("data:image"));
  const hasLongFile = files.some((file) => (file.text?.length || 0) > 7000);

  if (hasImage) {
    if (settings.providers.gemini.enabled) return "gemini";
    if (settings.providers.openai.enabled) return "openai";
    if (settings.providers.anthropic.enabled) return "anthropic";
    if (settings.providers.nvidia.enabled) return "nvidia";
  }

  if (/code|bug|typescript|next|react|api|component|github|git|terminal|function/.test(text)) {
    if (settings.providers.anthropic.enabled) return "anthropic";
    if (settings.providers.openai.enabled) return "openai";
    if (settings.providers.xai.enabled) return "xai";
  }

  if (hasLongFile || /document|pdf|analyze|review|compare|summarize/.test(text)) {
    if (settings.providers.anthropic.enabled) return "anthropic";
    if (settings.providers.gemini.enabled) return "gemini";
    if (settings.providers.openai.enabled) return "openai";
  }

  if (/latest|quick|fast|short/.test(text) && settings.providers.xai.enabled) return "xai";

  if (settings.providers.openai.enabled) return "openai";
  if (settings.providers.anthropic.enabled) return "anthropic";
  if (settings.providers.gemini.enabled) return "gemini";
  if (settings.providers.xai.enabled) return "xai";
  return "nvidia";
}

export function fallbackProviders(settings: AppSettings, primary: Provider) {
  const order: Provider[] = ["openai", "anthropic", "gemini", "xai", "nvidia"].filter((item) => item !== primary) as Provider[];
  return order.map((provider) => ({
    provider,
    model: selectedModel(settings, provider),
    apiKey: settings.providers[provider].apiKey,
    enabled: settings.providers[provider].enabled,
  }));
}
