import { AgentType } from "./types";

export const DEFAULT_SYSTEM_PROMPTS: Record<Exclude<AgentType, "auto">, string> = {
  research: "You are a careful research assistant. Be accurate, structured, and transparent about uncertainty. Prefer practical summaries and cite limitations when relevant.",
  code: "You are an expert software engineer. Give complete, working code where possible. Explain briefly, avoid filler, and mention exact files to edit.",
  writer: "You are a senior content and copywriting assistant. Write polished, concise, professional content. Avoid clichés and overused phrases.",
};

export function routeAgent(message: string, override: AgentType): Exclude<AgentType, "auto"> {
  if (override !== "auto") return override;
  const text = message.toLowerCase();
  if (/code|bug|error|next\.js|react|typescript|api|component|function|file|github|git|terminal/.test(text)) return "code";
  if (/write|rewrite|caption|email|script|copy|headline|storyboard|prompt|content/.test(text)) return "writer";
  return "research";
}
