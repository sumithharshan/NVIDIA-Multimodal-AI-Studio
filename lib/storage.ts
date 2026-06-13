import { AppSettings, ChatSession } from "./types";
import { DEFAULT_SYSTEM_PROMPTS } from "./agents";

export const SETTINGS_KEY = "unified-ai-studio-settings-v1";
export const CHATS_KEY = "unified-ai-studio-chats-v1";
export const ACTIVE_CHAT_KEY = "unified-ai-studio-active-chat-v1";

export const DEFAULT_SETTINGS: AppSettings = {
  activeProvider: "auto",
  autoRoute: true,
  fallbackEnabled: true,
  temperature: 0.6,
  maxTokens: 1600,
  streaming: true,
  providers: {
    openai: { enabled: true, apiKey: "", model: "gpt-4.1", customModel: "" },
    anthropic: { enabled: true, apiKey: "", model: "claude-sonnet-4-5", customModel: "" },
    gemini: { enabled: true, apiKey: "", model: "gemini-2.5-flash", customModel: "" },
    xai: { enabled: true, apiKey: "", model: "grok-4", customModel: "" },
    nvidia: { enabled: true, apiKey: "", model: "nvidia/llama-3.1-nemotron-70b-instruct", customModel: "" },
  },
  systemPrompts: DEFAULT_SYSTEM_PROMPTS,
  instructionProfiles: [
    { id: "default", name: "Default", active: true, content: "Be helpful, accurate, and concise. When giving code, mention the exact files to edit and avoid unnecessary explanation." },
  ],
};

export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

function mergeSettings(parsed: Partial<AppSettings>): AppSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...parsed,
    providers: {
      ...DEFAULT_SETTINGS.providers,
      ...(parsed.providers || {}),
      openai: { ...DEFAULT_SETTINGS.providers.openai, ...(parsed.providers?.openai || {}) },
      anthropic: { ...DEFAULT_SETTINGS.providers.anthropic, ...(parsed.providers?.anthropic || {}) },
      gemini: { ...DEFAULT_SETTINGS.providers.gemini, ...(parsed.providers?.gemini || {}) },
      xai: { ...DEFAULT_SETTINGS.providers.xai, ...(parsed.providers?.xai || {}) },
      nvidia: { ...DEFAULT_SETTINGS.providers.nvidia, ...(parsed.providers?.nvidia || {}) },
    },
    systemPrompts: { ...DEFAULT_SYSTEM_PROMPTS, ...(parsed.systemPrompts || {}) },
    instructionProfiles: parsed.instructionProfiles?.length ? parsed.instructionProfiles : DEFAULT_SETTINGS.instructionProfiles,
  };
}

export function loadSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return mergeSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadChats(): ChatSession[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(CHATS_KEY) || "[]"); } catch { return []; }
}

export function saveChats(chats: ChatSession[]) {
  localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
}

export function getActiveChatId() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_CHAT_KEY);
}

export function setActiveChatId(id: string) {
  localStorage.setItem(ACTIVE_CHAT_KEY, id);
}

export function createEmptyChat(): ChatSession {
  const now = new Date().toISOString();
  return { id: uid("chat"), title: "New chat", messages: [], createdAt: now, updatedAt: now };
}

export function titleFromMessage(message: string) {
  const clean = message.replace(/\s+/g, " ").trim();
  return clean.length > 48 ? `${clean.slice(0, 48)}...` : clean || "New chat";
}

export function selectedModel(settings: AppSettings, provider: keyof AppSettings["providers"]) {
  const item = settings.providers[provider];
  return item.model === "custom" ? item.customModel.trim() : item.model;
}

export function activeInstruction(settings: AppSettings) {
  return settings.instructionProfiles.filter((profile) => profile.active && profile.content.trim()).map((profile) => `# ${profile.name}\n${profile.content.trim()}`).join("\n\n");
}
