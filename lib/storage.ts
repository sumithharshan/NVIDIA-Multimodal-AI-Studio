import { AppSettings, ChatSession } from "./types";
import { DEFAULT_SYSTEM_PROMPTS } from "./agents";

export const SETTINGS_KEY = "nvidia-ma-settings-v1";
export const CHATS_KEY = "nvidia-ma-chats-v1";
export const ACTIVE_CHAT_KEY = "nvidia-ma-active-chat-v1";

export const DEFAULT_SETTINGS: AppSettings = {
  apiKey: "",
  model: "meta/llama-3.3-70b-instruct",
  customModel: "",
  temperature: 0.6,
  maxTokens: 1200,
  streaming: true,
  systemPrompts: DEFAULT_SYSTEM_PROMPTS,
};

export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

export function loadSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw), systemPrompts: { ...DEFAULT_SYSTEM_PROMPTS, ...JSON.parse(raw).systemPrompts } };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadChats(): ChatSession[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(CHATS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveChats(chats: ChatSession[]) {
  localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
}

export function getActiveChatId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_CHAT_KEY);
}

export function setActiveChatId(id: string) {
  localStorage.setItem(ACTIVE_CHAT_KEY, id);
}

export function createEmptyChat(): ChatSession {
  const now = new Date().toISOString();
  return {
    id: uid("chat"),
    title: "New chat",
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function titleFromMessage(message: string) {
  const clean = message.replace(/\s+/g, " ").trim();
  return clean.length > 46 ? `${clean.slice(0, 46)}...` : clean || "New chat";
}
