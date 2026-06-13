"use client";

import { MODEL_OPTIONS, getModelOption } from "@/lib/nvidia";

const capabilityStyles: Record<string, string> = {
  chat: "border-sky-400/20 bg-sky-400/10 text-sky-200",
  code: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
  vision: "border-fuchsia-400/20 bg-fuchsia-400/10 text-fuchsia-200",
  "image-generation": "border-amber-400/20 bg-amber-400/10 text-amber-200",
  "image-edit": "border-rose-400/20 bg-rose-400/10 text-rose-200",
  "tool-calling": "border-violet-400/20 bg-violet-400/10 text-violet-200",
  translation: "border-cyan-400/20 bg-cyan-400/10 text-cyan-200",
  tts: "border-lime-400/20 bg-lime-400/10 text-lime-200",
};

export default function ModelSelector({ model, customModel, onModelChange, onCustomModelChange }: {
  model: string;
  customModel: string;
  onModelChange: (value: string) => void;
  onCustomModelChange: (value: string) => void;
}) {
  const isCustom = model === "custom";
  const option = getModelOption(model);

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-slate-300">Model</label>
      <select value={model} onChange={(event) => onModelChange(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-blue-400/50">
        {MODEL_OPTIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        <option value="custom">Custom model ID</option>
      </select>
      {isCustom ? (
        <input value={customModel} onChange={(event) => onCustomModelChange(event.target.value)} placeholder="provider/model-name" className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-blue-400/50" />
      ) : option ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-white">{option.label}</span>
            {option.provider ? <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-slate-400">{option.provider}</span> : null}
          </div>
          {option.description ? <p className="mt-2 text-xs leading-5 text-slate-400">{option.description}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {option.capabilities.map((capability) => (
              <span key={capability} className={`rounded-full border px-2.5 py-1 text-[11px] capitalize ${capabilityStyles[capability] || "border-white/10 bg-white/10 text-slate-200"}`}>
                {capability.replace("-", " ")}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
