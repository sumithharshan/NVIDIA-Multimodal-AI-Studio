"use client";

import Link from "next/link";
import ProviderBadge from "./ProviderBadge";
import { ProviderId } from "@/lib/types";

export default function TopNav({
  provider,
  model,
  instructionsActive,
  fallback,
  onExport,
  onClear,
  onMenuClick,
}: {
  provider: ProviderId;
  model: string;
  instructionsActive: boolean;
  fallback: boolean;
  onExport: () => void;
  onClear: () => void;
  onMenuClick?: () => void;
}) {
  return (
    <header className="panel-surface relative z-10 flex items-center justify-between gap-3 border-b border-white/8 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        {onMenuClick ? (
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Open chat list"
            className="btn-ghost rounded-xl p-2.5 lg:hidden"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        ) : null}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <ProviderBadge provider={provider} model={provider === "auto" ? "smart routing" : model} />
            {instructionsActive ? (
              <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-2.5 py-1 text-[11px] font-semibold text-violet-200">
                Instructions active
              </span>
            ) : null}
            {fallback ? (
              <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-[11px] font-semibold text-amber-200">
                Fallback on
              </span>
            ) : null}
          </div>
          <p className="mt-1 hidden text-xs text-slate-500 sm:block">Unified AI Chat Studio</p>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <button onClick={onExport} className="btn-ghost hidden rounded-xl px-3 py-2 text-xs sm:inline-flex">
          Export
        </button>
        <button onClick={onClear} className="btn-ghost rounded-xl px-3 py-2 text-xs">
          Clear
        </button>
        <Link href="/settings" className="btn-ghost rounded-xl px-3 py-2 text-xs font-medium text-white">
          Settings
        </Link>
      </div>
    </header>
  );
}
