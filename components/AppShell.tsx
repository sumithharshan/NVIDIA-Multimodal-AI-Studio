import type { ReactNode } from "react";

export default function AppShell({ children }: { children: ReactNode }) {
  return <div className="app-canvas relative min-h-screen text-slate-100">{children}</div>;
}
