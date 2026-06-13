"use client";

import { ChatMessage as ChatMessageType } from "@/lib/types";
import MarkdownRenderer from "./MarkdownRenderer";
import ProviderBadge from "./ProviderBadge";

export default function ChatMessage({ message, isStreaming, onEdit, onRegenerate }: {
  message: ChatMessageType;
  isStreaming?: boolean;
  onEdit?: (message: ChatMessageType) => void;
  onRegenerate?: () => void;
}) {
  const isUser = message.role === "user";

  async function copy() {
    await navigator.clipboard.writeText(message.content);
  }

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`panel-surface max-w-[88%] overflow-visible rounded-3xl p-4 ${
          isUser ? "border-blue-400/20 bg-blue-500/10" : ""
        }`}
      >
        <div className="mb-2 flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{isUser ? "You" : "AI"}</span>
            {!isUser && message.provider ? <ProviderBadge provider={message.provider} model={message.model} /> : null}
            {message.stopped ? <span className="rounded-full border border-rose-400/20 bg-rose-400/10 px-2 py-0.5 text-[11px] text-rose-200">Stopped</span> : null}
          </div>
          <div className="flex shrink-0 gap-2">
            {isUser && onEdit ? <button onClick={() => onEdit(message)} className="btn-ghost rounded-full px-2.5 py-1 text-[11px]">Edit</button> : null}
            {!isUser && onRegenerate ? <button onClick={onRegenerate} className="btn-ghost rounded-full px-2.5 py-1 text-[11px]">Regenerate</button> : null}
            <button onClick={copy} className="btn-ghost rounded-full px-2.5 py-1 text-[11px]">Copy</button>
          </div>
        </div>

        {message.files?.length ? (
          <div className="mb-3 flex flex-wrap gap-2">
            {message.files.map((file) => (
              <div key={file.id} className="overflow-hidden rounded-2xl border border-white/10 bg-black/20 p-2 text-xs text-slate-300">
                {file.dataUrl ? <img src={file.dataUrl} alt={file.name} className="mb-2 h-32 w-44 rounded-xl object-cover" /> : null}
                <div className="max-w-[220px] truncate">{file.name}</div>
              </div>
            ))}
          </div>
        ) : null}

        {isUser ? (
          <p className="whitespace-pre-wrap text-xs leading-6 text-slate-100">{message.content}</p>
        ) : message.content ? (
          <MarkdownRenderer content={message.content} typing={isStreaming} />
        ) : isStreaming ? (
          <div className="flex items-center gap-1 py-2 text-slate-400">
            <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-.2s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-.1s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
