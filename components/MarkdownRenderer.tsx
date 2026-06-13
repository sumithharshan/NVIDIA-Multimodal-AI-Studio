"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

function normalizeChatMarkdown(content: string): string {
  let text = content.replace(/\r\n/g, "\n").trim();
  if (!text) return "";

  // "Title: 1. Section" → break before the numbered list.
  text = text.replace(/:\s*(\d+\.\s)/g, ":\n\n$1");

  // Break before numbered sections on a new line or glued after punctuation.
  text = text.replace(/([^\n])\n(\d+\.\s)/g, "$1\n\n$2");
  text = text.replace(/([.!?])\s+(\d+\.\s)/g, "$1\n\n$2");

  // Break before bullets and markdown headings.
  text = text.replace(/([^\n])\n([-*•]\s)/g, "$1\n\n$2");
  text = text.replace(/([^\n])\n(#{1,6}\s)/g, "$1\n\n$2");

  return text.replace(/\n{3,}/g, "\n\n");
}

const markdownComponents: Components = {
  p: ({ children }) => <p className="mb-4 text-xs leading-6 text-slate-100 last:mb-0">{children}</p>,
  h1: ({ children }) => <h1 className="mb-4 mt-6 text-lg font-bold text-white first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-3 mt-6 text-base font-semibold text-white first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-3 mt-5 text-sm font-semibold text-white first:mt-0">{children}</h3>,
  h4: ({ children }) => <h4 className="mb-2 mt-4 text-xs font-semibold text-slate-100 first:mt-0">{children}</h4>,
  ul: ({ children }) => <ul className="my-4 list-disc space-y-3 pl-5 text-xs marker:text-slate-500">{children}</ul>,
  ol: ({ children }) => <ol className="my-4 list-decimal space-y-5 pl-5 text-xs marker:font-semibold marker:text-slate-300">{children}</ol>,
  li: ({ children }) => <li className="leading-6 text-slate-100 [&>p]:mb-3 [&>p:last-child]:mb-0">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-4 border-l-2 border-blue-400/40 pl-4 text-slate-300">{children}</blockquote>
  ),
  hr: () => <hr className="my-6 border-white/10" />,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-blue-300 underline decoration-blue-300/40 underline-offset-2 hover:text-blue-200">
      {children}
    </a>
  ),
  code: ({ className, children }) => {
    const isBlock = Boolean(className);
    if (isBlock) {
      return <code className={className}>{children}</code>;
    }
    return <code className="rounded bg-white/10 px-1.5 py-0.5 text-[0.9em] text-blue-100">{children}</code>;
  },
  pre: ({ children }) => (
    <pre className="my-4 overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/90 p-4 text-xs leading-5 text-slate-100">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto">
      <table className="min-w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border border-white/10 bg-white/5 px-3 py-2 text-left font-semibold">{children}</th>,
  td: ({ children }) => <td className="border border-white/10 px-3 py-2">{children}</td>,
};

export default function MarkdownRenderer({ content, typing }: { content: string; typing?: boolean }) {
  const normalized = normalizeChatMarkdown(content);

  return (
    <div className={`chat-markdown text-xs ${typing ? "typing-cursor" : ""}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {normalized}
      </ReactMarkdown>
    </div>
  );
}
