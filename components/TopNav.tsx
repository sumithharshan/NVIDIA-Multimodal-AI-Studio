"use client";

import Link from "next/link";

export default function TopNav({ model, onExport, onClear }: { model: string; onExport?: () => void; onClear?: () => void }) {
  return (
    <header className="sticky top-0 z-10 border-b border-white/10 bg-slate-950/70 px-4 py-3 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-blue-300">Multi-agent workspace</p>
          <h2 className="truncate text-base font-semibold text-white">{model || "No model selected"}</h2>
        </div>
        <nav className="flex items-center gap-2">
          {onExport && <button onClick={onExport} className="rounded-2xl border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10">Export</button>}
          {onClear && <button onClick={onClear} className="rounded-2xl border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10">Clear</button>}
          <Link href="/settings" className="rounded-2xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-400">Settings</Link>
        </nav>
      </div>
    </header>
  );
}
