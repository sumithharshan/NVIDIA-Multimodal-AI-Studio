"use client";

import { useMemo, useState } from "react";
import { AgentType, UploadedContextFile } from "@/lib/types";
import { parseClipboardItems, parseFiles } from "@/lib/file-utils";
import { supportsTranslation, supportsTTS } from "@/lib/nvidia";
import AgentBadge from "./AgentBadge";
import FileUploader from "./FileUploader";

const LANGUAGES = [
  ["en", "English"],
  ["hi", "Hindi"],
  ["si", "Sinhala"],
  ["ar", "Arabic"],
  ["de", "German"],
  ["es-ES", "Spanish - Spain"],
  ["es-US", "Spanish - LATAM"],
  ["fr", "French"],
  ["pt-BR", "Portuguese - Brazil"],
  ["ru", "Russian"],
  ["zh-CN", "Chinese - Simplified"],
  ["zh-TW", "Chinese - Traditional"],
  ["ja", "Japanese"],
  ["ko", "Korean"],
];

const SPEECH_RECOGNITION_LANG: Record<string, string> = {
  en: "en-US",
  hi: "hi-IN",
  si: "si-LK",
  ar: "ar-AE",
  de: "de-DE",
  "es-ES": "es-ES",
  "es-US": "es-US",
  fr: "fr-FR",
  "pt-BR": "pt-BR",
  ru: "ru-RU",
  "zh-CN": "zh-CN",
  "zh-TW": "zh-TW",
  ja: "ja-JP",
  ko: "ko-KR",
};

function getLanguageLabel(code: string) {
  return LANGUAGES.find(([value]) => value === code)?.[1] || code;
}

export default function ChatInput({
  onSend,
  disabled,
  isGenerating,
  onStop,
  selectedModel,
}: {
  onSend: (content: string, agent: AgentType, files: UploadedContextFile[]) => void;
  disabled?: boolean;
  isGenerating?: boolean;
  onStop?: () => void;
  selectedModel: string;
}) {
  const [content, setContent] = useState("");
  const [agent, setAgent] = useState<AgentType>("auto");
  const [files, setFiles] = useState<UploadedContextFile[]>([]);
  const [pasteStatus, setPasteStatus] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [sourceLang, setSourceLang] = useState("en");
  const [targetLang, setTargetLang] = useState("hi");

  const isTranslation = useMemo(() => supportsTranslation(selectedModel), [selectedModel]);
  const isTTS = useMemo(() => supportsTTS(selectedModel), [selectedModel]);

  function finalContent() {
    const trimmed = content.trim();

    if (isTranslation) {
      return `Translate the following text from ${getLanguageLabel(sourceLang)} to ${getLanguageLabel(targetLang)}. Return only the translated text, preserving names and formatting when possible.\n\n${trimmed || "Please translate the attached file text."}`;
    }

    if (isTTS) {
      return trimmed || "Please convert the attached text to speech.";
    }

    return trimmed || "Please analyze or use the attached files.";
  }

  function submit() {
    if (!content.trim() && !files.length) return;
    onSend(finalContent(), agent, files);
    setContent("");
    setFiles([]);
    setPasteStatus("");
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  async function onPaste(event: React.ClipboardEvent<HTMLTextAreaElement>) {
    const hasFile = Array.from(event.clipboardData.items).some((item) => item.kind === "file");
    if (!hasFile) return;

    event.preventDefault();
    const parsed = await parseClipboardItems(event.clipboardData.items);

    if (parsed.length) {
      setFiles((current) => [...current, ...parsed]);
      setPasteStatus(`${parsed.length} pasted file${parsed.length > 1 ? "s" : ""} added.`);
      window.setTimeout(() => setPasteStatus(""), 2200);
    }
  }

  async function onDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!event.dataTransfer.files?.length) return;
    const parsed = await parseFiles(event.dataTransfer.files);
    setFiles((current) => [...current, ...parsed]);
  }

  function startVoiceInput() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setPasteStatus("Speech input is not supported in this browser. Chrome/Edge usually support it.");
      window.setTimeout(() => setPasteStatus(""), 3500);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = SPEECH_RECOGNITION_LANG[sourceLang] || "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsListening(true);

    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      if (transcript) setContent((current) => `${current}${current ? " " : ""}${transcript}`);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  }

  return (
    <div onDragOver={(event) => event.preventDefault()} onDrop={onDrop} className="rounded-3xl border border-white/10 bg-slate-950/80 p-3 shadow-glow backdrop-blur-xl">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(["auto", "research", "code", "writer"] as AgentType[]).map((item) => (
            <button key={item} onClick={() => setAgent(item)} className={`rounded-full transition ${agent === item ? "ring-2 ring-blue-400/40" : "opacity-70 hover:opacity-100"}`}>
              <AgentBadge agent={item} />
            </button>
          ))}
        </div>
        <FileUploader files={files} setFiles={setFiles} />
      </div>

      {isTranslation ? (
        <div className="mb-3 grid gap-2 rounded-2xl border border-blue-400/15 bg-blue-400/10 p-3 sm:grid-cols-2">
          <label className="text-xs text-blue-100">
            Source language
            <select value={sourceLang} onChange={(event) => setSourceLang(event.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white outline-none">
              {LANGUAGES.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
            </select>
          </label>

          <label className="text-xs text-blue-100">
            Target language
            <select value={targetLang} onChange={(event) => setTargetLang(event.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white outline-none">
              {LANGUAGES.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
            </select>
          </label>
        </div>
      ) : null}

      {(files.some((file) => file.warning) || pasteStatus) ? (
        <div className="mb-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-xs text-amber-100">
          {pasteStatus || files.find((file) => file.warning)?.warning}
        </div>
      ) : null}

      <div className="flex gap-3">
        <div className="flex-1">
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            placeholder={isTTS ? "Type text to convert into voice output..." : isTranslation ? "Paste text to translate, or use Speak input..." : "Ask anything, upload context, or paste screenshots with Ctrl+V..."}
            rows={2}
            className="min-h-[64px] w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-blue-400/50"
          />

          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            <span>Tip: paste screenshots directly into the chat box or drag images into this area.</span>
            <button type="button" onClick={startVoiceInput} className="rounded-full border border-white/10 px-3 py-1 text-slate-300 hover:bg-white/10">
              {isListening ? "Listening..." : "Speak input"}
            </button>
          </div>
        </div>

        {isGenerating ? (
          <button onClick={onStop} className="rounded-2xl border border-rose-400/30 bg-rose-500/15 px-5 py-3 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/25">
            Stop
          </button>
        ) : (
          <button disabled={disabled} onClick={submit} className="rounded-2xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50">
            {isTTS ? "Generate Voice" : isTranslation ? "Translate" : "Send"}
          </button>
        )}
      </div>
    </div>
  );
}
