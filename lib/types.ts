export type AgentType = "auto" | "research" | "code" | "writer";
export type ChatRole = "user" | "assistant" | "system";

export type UploadedContextFile = {
  id: string;
  name: string;
  type: string;
  size: number;
  text?: string;
  dataUrl?: string;
  warning?: string;
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  agent?: Exclude<AgentType, "auto">;
  files?: UploadedContextFile[];
  generatedImages?: string[];
  generatedAudio?: string;
  createdAt: string;
};

export type ChatSession = {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
};

export type AppSettings = {
  apiKey: string;
  model: string;
  customModel: string;
  temperature: number;
  maxTokens: number;
  streaming: boolean;
  systemPrompts: Record<Exclude<AgentType, "auto">, string>;
};

export type ModelCapability =
  | "chat"
  | "code"
  | "vision"
  | "image-generation"
  | "image-edit"
  | "tool-calling"
  | "translation"
  | "tts"
  | "self-hosted";

export type ModelOption = {
  id: string;
  label: string;
  provider?: string;
  description?: string;
  capabilities: ModelCapability[];
};
