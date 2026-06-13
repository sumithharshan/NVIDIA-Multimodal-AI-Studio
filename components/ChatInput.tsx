"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { AgentType, UploadedContextFile } from "@/lib/types";
import { parseClipboardItems, parseFiles } from "@/lib/file-utils";
import FileUploader, { FileAttachmentList } from "./FileUploader";

const AGENTS: { id: AgentType; label: string; hint: string }[] = [
  { id: "auto", label: "Auto", hint: "Route by intent" },
  { id: "research", label: "Research", hint: "Deep analysis" },
  { id: "code", label: "Code", hint: "Programming focus" },
  { id: "writer", label: "Writer", hint: "Polished prose" },
];

const PROMPT_GROUPS = [
  {
    label: "Clarity",
    prompts: ["Summarize this clearly", "Explain step by step", "Rewrite professionally"],
  },
  {
    label: "Build",
    prompts: ["Generate code", "Find issues and improvements", "Create a clean plan"],
  },
  {
    label: "Structure",
    prompts: ["Extract data as table", "Compare options"],
  },
];

export type ChatInputHandle = {
  setDraft: (content: string, files?: UploadedContextFile[]) => void;
  focus: () => void;
};

const ChatInput = forwardRef<
  ChatInputHandle,
  {
    onSend: (content: string, agent: AgentType, files: UploadedContextFile[]) => void;
    disabled?: boolean;
    isGenerating?: boolean;
    onStop?: () => void;
  }
>(({ onSend, disabled, isGenerating, onStop }, ref) => {
  const [content, setContent] = useState("");
  const [agent, setAgent] = useState<AgentType>("auto");
  const [files, setFiles] = useState<UploadedContextFile[]>([]);
  const [status, setStatus] = useState("");
  const [promptsOpen, setPromptsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const promptsRef = useRef<HTMLDivElement | null>(null);

  const activeAgent = AGENTS.find((item) => item.id === agent) ?? AGENTS[0];
  const canSend = Boolean(content.trim() || files.length);
  const fileWarning = files.find((file) => file.warning)?.warning;

  useImperativeHandle(ref, () => ({
    setDraft(nextContent, nextFiles = []) {
      setContent(nextContent);
      setFiles(nextFiles);
      requestAnimationFrame(() => textareaRef.current?.focus());
    },
    focus() {
      textareaRef.current?.focus();
    },
  }));

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [content]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!promptsRef.current?.contains(event.target as Node)) {
        setPromptsOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function submit() {
    if (!canSend) return;
    onSend(content.trim() || "Please analyze the attached files.", agent, files);
    setContent("");
    setFiles([]);
    setStatus("");
    setPromptsOpen(false);
  }

  function applyPreset(preset: string) {
    setContent((current) => (current ? `${current.trim()}\n\n${preset}` : preset));
    setPromptsOpen(false);
    textareaRef.current?.focus();
  }

  function clearDraft() {
    setContent("");
    setFiles([]);
    setStatus("");
    textareaRef.current?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
    if (event.key === "Escape") {
      setPromptsOpen(false);
    }
  }

  async function onPaste(event: React.ClipboardEvent<HTMLTextAreaElement>) {
    const hasFile = Array.from(event.clipboardData.items).some((item) => item.kind === "file");
    if (!hasFile) return;
    event.preventDefault();
    const parsed = await parseClipboardItems(event.clipboardData.items);
    setFiles((current) => [...current, ...parsed]);
    setStatus(`${parsed.length} pasted image${parsed.length > 1 ? "s" : ""} added.`);
    window.setTimeout(() => setStatus(""), 2500);
  }

  async function onDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const parsed = await parseFiles(event.dataTransfer.files);
    if (parsed.length) {
      setFiles((current) => [...current, ...parsed]);
      setStatus(`${parsed.length} file${parsed.length > 1 ? "s" : ""} attached.`);
      window.setTimeout(() => setStatus(""), 2500);
    }
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          setIsDragging(false);
        }
      }}
      onDrop={onDrop}
      className={`panel-surface relative rounded-3xl shadow-glow transition ${
        isDragging ? "drag-overlay ring-1 ring-blue-400/40" : ""
      }`}
    >
      {isDragging ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-3xl bg-blue-500/10 backdrop-blur-[1px]">
          <p className="rounded-full border border-blue-400/30 bg-slate-950/80 px-4 py-2 text-sm font-medium text-blue-100">
            Drop files to attach
          </p>
        </div>
      ) : null}

      {(status || fileWarning) ? (
        <div className="border-b border-amber-400/15 bg-amber-400/10 px-4 py-2 text-xs text-amber-100">
          {status || fileWarning}
        </div>
      ) : null}

      <FileAttachmentList files={files} setFiles={setFiles} />

      <div className="px-4 pt-4">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          rows={2}
          placeholder="Ask anything… paste images with Ctrl+V, or drop files here"
          className="max-h-[220px] min-h-[72px] w-full resize-none bg-transparent text-sm leading-7 text-slate-100 outline-none placeholder:text-slate-500"
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-white/8 px-3 py-3 sm:px-4">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <div
            className="inline-flex rounded-xl border border-white/10 bg-black/20 p-0.5"
            role="tablist"
            aria-label="Agent mode"
          >
            {AGENTS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={agent === item.id}
                title={item.hint}
                onClick={() => setAgent(item.id)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition sm:px-3 ${
                  agent === item.id
                    ? "bg-blue-500/20 text-blue-100 shadow-[inset_0_0_0_1px_rgba(96,165,250,0.25)]"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="relative" ref={promptsRef}>
            <button
              type="button"
              onClick={() => setPromptsOpen((open) => !open)}
              className={`btn-ghost inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium ${
                promptsOpen ? "bg-white/10 text-white" : ""
              }`}
              aria-expanded={promptsOpen}
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
                <path
                  d="M4 7h7m-7 5h11m-11 5h7"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
              Prompts
            </button>

            {promptsOpen ? (
              <div className="absolute bottom-[calc(100%+10px)] left-0 z-50 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-slate-950/98 p-3 shadow-glow backdrop-blur-xl">
                <p className="mb-3 px-1 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500">
                  Quick prompts
                </p>
                <div className="space-y-3">
                  {PROMPT_GROUPS.map((group) => (
                    <div key={group.label}>
                      <p className="mb-1.5 px-1 text-[11px] font-semibold text-slate-400">{group.label}</p>
                      <div className="flex flex-col gap-1">
                        {group.prompts.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => applyPreset(preset)}
                            className="rounded-xl px-3 py-2 text-left text-xs leading-5 text-slate-200 transition hover:bg-white/8"
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <FileUploader files={files} setFiles={setFiles} compact />
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden text-[11px] text-slate-500 sm:inline" title="Enter to send, Shift+Enter for new line">
            {activeAgent.hint}
          </span>

          {canSend && !isGenerating ? (
            <button
              type="button"
              onClick={clearDraft}
              className="btn-ghost rounded-xl px-2.5 py-2 text-xs"
              title="Clear message"
            >
              Clear
            </button>
          ) : null}

          {isGenerating ? (
            <button
              type="button"
              onClick={onStop}
              className="inline-flex items-center gap-2 rounded-xl border border-rose-400/30 bg-rose-500/15 px-4 py-2 text-sm font-semibold text-rose-100 hover:bg-rose-500/25"
            >
              <span className="h-2 w-2 animate-pulse rounded-full bg-rose-300" />
              Stop
            </button>
          ) : (
            <button
              type="button"
              disabled={disabled || !canSend}
              onClick={submit}
              className="btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
            >
              Send
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
                <path
                  d="M5 12h12m0 0l-4-4m4 4l-4 4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

ChatInput.displayName = "ChatInput";
export default ChatInput;
