"use client";

import { UploadedContextFile } from "@/lib/types";
import { parseFiles } from "@/lib/file-utils";

export default function FileUploader({
  files,
  setFiles,
  compact,
}: {
  files: UploadedContextFile[];
  setFiles: (files: UploadedContextFile[]) => void;
  compact?: boolean;
}) {
  async function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (!event.target.files?.length) return;
    const parsed = await parseFiles(event.target.files);
    setFiles([...files, ...parsed]);
    event.target.value = "";
  }

  return (
    <label
      className={`btn-ghost inline-flex cursor-pointer items-center gap-2 rounded-xl text-xs font-medium ${
        compact ? "px-3 py-2" : "px-4 py-2 text-sm"
      }`}
      title="Attach files or images"
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
        <path
          d="M8.5 12.5l6.2-6.2a3 3 0 014.2 4.2l-7.4 7.4a4.5 4.5 0 01-6.4-6.4l8-8"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {compact ? <span className="hidden sm:inline">Attach</span> : "Upload"}
      <input
        className="hidden"
        type="file"
        multiple
        accept=".txt,.md,.json,.csv,.pdf,image/*,.zip,application/zip,application/x-zip-compressed,application/x-compressed"
        onChange={onChange}
      />
    </label>
  );
}

export function FileAttachmentList({
  files,
  setFiles,
}: {
  files: UploadedContextFile[];
  setFiles: (files: UploadedContextFile[]) => void;
}) {
  if (!files.length) return null;

  return (
    <div className="flex flex-wrap gap-2 border-b border-white/8 px-4 py-3">
      {files.map((file) => (
        <div
          key={file.id}
          className="group inline-flex max-w-full items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-2.5 py-1.5 text-xs text-slate-300"
        >
          {file.dataUrl ? (
            <img src={file.dataUrl} alt={file.name} className="h-7 w-7 shrink-0 rounded-lg object-cover" />
          ) : (
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/8 text-[10px] font-semibold uppercase text-slate-400">
              {file.name.split(".").pop()?.slice(0, 3) || "file"}
            </span>
          )}
          <span className="max-w-[140px] truncate">{file.name}</span>
          <button
            type="button"
            onClick={() => setFiles(files.filter((item) => item.id !== file.id))}
            className="rounded-md px-1 text-slate-500 transition hover:bg-white/10 hover:text-white"
            aria-label={`Remove ${file.name}`}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
