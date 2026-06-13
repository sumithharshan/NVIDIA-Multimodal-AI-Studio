export type ProviderId = "auto" | "openai" | "anthropic" | "gemini" | "xai" | "nvidia";
export type AgentType = "auto" | "research" | "code" | "writer";
export type ChatRole = "user" | "assistant" | "system";

export type ModelCapability = "chat" | "code" | "vision" | "long-context" | "fast" | "reasoning";

export type ModelInfo = {
  id: string;
  label: string;
  provider: Exclude<ProviderId, "auto">;
  description: string;
  capabilities: ModelCapability[];
  recommended?: boolean;
};

export type ProviderSettings = {
  enabled: boolean;
  apiKey: string;
  model: string;
  customModel: string;
};

export type InstructionProfile = {
  id: string;
  name: string;
  content: string;
  active: boolean;
};

export type AppSettings = {
  providers: Record<Exclude<ProviderId, "auto">, ProviderSettings>;
  activeProvider: ProviderId;
  autoRoute: boolean;
  fallbackEnabled: boolean;
  temperature: number;
  maxTokens: number;
  streaming: boolean;
  systemPrompts: Record<Exclude<AgentType, "auto">, string>;
  instructionProfiles: InstructionProfile[];
};

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
  provider?: Exclude<ProviderId, "auto">;
  model?: string;
  files?: UploadedContextFile[];
  stopped?: boolean;
  createdAt: string;
};

export type ChatSession = {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
};

export type ChatRequestMessage = {
  role: "user" | "assistant";
  content: string | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;
};

export type ProviderChatRequest = {
  provider: Exclude<ProviderId, "auto">;
  model: string;
  apiKey?: string;
  messages: ChatRequestMessage[];
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  stream: boolean;
  fallbackEnabled?: boolean;
  fallbackProviders?: Array<{
    provider: Exclude<ProviderId, "auto">;
    model: string;
    apiKey?: string;
    enabled: boolean;
  }>;
};
