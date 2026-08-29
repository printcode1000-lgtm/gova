
import { uiAttributes } from "@asol/ui-registry-core";export function SummaryCard({ id,
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "red" | "amber" | "blue" | "green";
} & { id?: string }) {
  const toneClass =
    tone === "red"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : tone === "blue"
          ? "border-blue-200 bg-blue-50 text-blue-700"
          : tone === "green"
            ? "border-green-200 bg-green-50 text-green-700"
            : "bg-surface text-on-surface";
  return (
    <div {...uiAttributes({ uid: "data-health.summary-card.div-8Q2K0b", id: "data-health.summary-card.div" })} id={id} className={`rounded-md border p-3 ${toneClass}`}>
      <div {...uiAttributes({ uid: "data-health.summary-card.div.2-v2HRBS", id: "data-health.summary-card.div.2" })} className="text-xs opacity-80">{label}</div>
      <div {...uiAttributes({ uid: "data-health.summary-card.div.3-6PYgMA", id: "data-health.summary-card.div.3" })} className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
