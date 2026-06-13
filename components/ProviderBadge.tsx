import { ProviderId } from "@/lib/types";
import { PROVIDER_COLORS, PROVIDER_LABELS } from "@/lib/model-registry";

export default function ProviderBadge({ provider, model }: { provider: ProviderId; model?: string }) {
  const label = provider === "auto" ? "Auto" : PROVIDER_LABELS[provider];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${PROVIDER_COLORS[provider]}`}>
      {label}{model ? <span className="max-w-[160px] truncate opacity-70">· {model}</span> : null}
    </span>
  );
}
