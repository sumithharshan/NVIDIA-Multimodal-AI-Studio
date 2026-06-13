import { AgentType } from "./types";

export const DEFAULT_SYSTEM_PROMPTS = {
  research: "You are the Research Agent. Give accurate, structured, practical answers. State assumptions clearly. When information may be current or factual, recommend verification unless live tools are available.",
  code: "You are the Code Agent. Provide clean, production-minded code. Explain important decisions briefly. Prefer modern Next.js, TypeScript, React, and secure API patterns.",
  writer: "You are the Writer Agent. Write polished, concise, natural content. Avoid clichés and generic fluff. Keep tone refined and useful.",
};

export const AGENT_LABELS: Record<AgentType, string> = {
  auto: "Auto",
  research: "Research",
  code: "Code",
  writer: "Writer",
};

export function routeAgent(input: string, override: AgentType): Exclude<AgentType, "auto"> {
  if (override !== "auto") return override;
  const text = input.toLowerCase();
  const codeWords = ["code", "bug", "debug", "typescript", "javascript", "react", "next", "api", "component", "function", "error", "tailwind", "css", "html"];
  const writerWords = ["write", "rewrite", "caption", "email", "script", "copy", "headline", "text", "tone", "grammar", "make it professional"];
  const researchWords = ["research", "compare", "analysis", "explain", "summarize", "why", "what is", "pros", "cons"];

  if (codeWords.some((word) => text.includes(word))) return "code";
  if (writerWords.some((word) => text.includes(word))) return "writer";
  if (researchWords.some((word) => text.includes(word))) return "research";
  return "research";
}
