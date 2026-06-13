"use client";

import Image from "next/image";
import { UploadedContextFile } from "@/lib/types";
import { parseFiles } from "@/lib/file-utils";

export default function FileUploader({ files, setFiles }: { files: UploadedContextFile[]; setFiles: (files: UploadedContextFile[]) => void }) {
  async function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (!event.target.files?.length) return;
    const parsed = await parseFiles(event.target.files);
    setFiles([...files, ...parsed]);
    event.target.value = "";
  }

  return (
    <div className="space-y-2">
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10">
        Upload files
        <input className="hidden" type="file" multiple accept=".txt,.md,.json,.csv,.pdf,image/*,audio/*" onChange={onChange} />
      </label>

      {files.length ? (
        <div className="flex flex-wrap gap-2">
          {files.map((file) => (
            <div key={file.id} className="group inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-slate-300">
              {file.dataUrl && file.type.startsWith("image/") ? (
                <span className="relative h-8 w-8 overflow-hidden rounded-lg border border-white/10">
                  <Image src={file.dataUrl} alt={file.name} fill className="object-cover" unoptimized />
                </span>
              ) : null}
              <span className="max-w-[160px] truncate">{file.name}</span>
              <button onClick={() => setFiles(files.filter((item) => item.id !== file.id))} className="text-slate-500 transition hover:text-white">×</button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
