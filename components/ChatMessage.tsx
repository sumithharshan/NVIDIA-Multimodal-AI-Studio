"use client";

import Image from "next/image";
import { ChatMessage as ChatMessageType } from "@/lib/types";
import AgentBadge from "./AgentBadge";
import MarkdownRenderer from "./MarkdownRenderer";

export default function ChatMessage({ message }: { message: ChatMessageType }) {
  const isUser = message.role === "user";

  async function copy() {
    await navigator.clipboard.writeText(message.content);
  }

  function speak() {
    if (!message.content || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message.content.replace(/```[\s\S]*?```/g, ""));
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  }

  function stopSpeak() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[86%] rounded-3xl border p-4 shadow-sm ${isUser ? "border-blue-400/20 bg-blue-500/15" : "border-white/10 bg-white/[0.055]"}`}>
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{isUser ? "You" : "AI"}</span>
            {!isUser && message.agent && <AgentBadge agent={message.agent} />}
          </div>
          <div className="flex items-center gap-2">
            {!isUser ? (
              <>
                <button onClick={speak} className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-slate-300 transition hover:bg-white/10">Voice</button>
                <button onClick={stopSpeak} className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-slate-300 transition hover:bg-white/10">Stop</button>
              </>
            ) : null}
            <button onClick={copy} className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-slate-300 transition hover:bg-white/10">
              Copy
            </button>
          </div>
        </div>

        {message.files?.length ? (
          <div className="mb-3 flex flex-wrap gap-2">
            {message.files.map((file) => (
              <div key={file.id} className="overflow-hidden rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-300">
                {file.dataUrl && file.type.startsWith("image/") ? (
                  <div className="mb-2">
                    <div className="relative h-40 w-48 overflow-hidden rounded-xl border border-white/10">
                      <Image src={file.dataUrl} alt={file.name} fill className="object-cover" unoptimized />
                    </div>
                  </div>
                ) : null}
                <div className="max-w-[240px] truncate">{file.name}</div>
              </div>
            ))}
          </div>
        ) : null}

        {message.generatedImages?.length ? (
          <div className="mb-3 grid gap-3 sm:grid-cols-2">
            {message.generatedImages.map((src, index) => (
              <a key={`${message.id}-${index}`} href={src} target="_blank" rel="noreferrer" className="group block overflow-hidden rounded-2xl border border-white/10 bg-black/25">
                <div className="relative aspect-square w-full">
                  <Image src={src} alt={`Generated image ${index + 1}`} fill className="object-cover transition duration-300 group-hover:scale-[1.02]" unoptimized />
                </div>
              </a>
            ))}
          </div>
        ) : null}


        {message.generatedAudio ? (
          <div className="mb-3 rounded-2xl border border-white/10 bg-black/25 p-3">
            <audio src={message.generatedAudio} controls className="w-full" />
          </div>
        ) : null}

        {isUser ? <p className="whitespace-pre-wrap text-sm leading-7 text-slate-100">{message.content}</p> : <MarkdownRenderer content={message.content} />}
      </div>
    </div>
  );
}
