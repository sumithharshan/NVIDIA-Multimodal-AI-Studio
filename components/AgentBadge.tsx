import { AgentType } from "@/lib/types";
import { AGENT_LABELS } from "@/lib/agents";

const styles: Record<string, string> = {
  auto: "border-slate-500/40 bg-slate-500/10 text-slate-200",
  research: "border-sky-400/40 bg-sky-400/10 text-sky-200",
  code: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200",
  writer: "border-fuchsia-400/40 bg-fuchsia-400/10 text-fuchsia-200",
};

export default function AgentBadge({ agent = "auto" }: { agent?: AgentType }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${styles[agent]}`}>
      {AGENT_LABELS[agent]}
    </span>
  );
}
