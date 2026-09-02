
export function DetailRow({ id,
  label,
  value,
  ltr,
}: {
  label: string;
  value: string;
  ltr?: boolean;
} & { id?: string }) {
  return (
    <div id={id} className="grid gap-1 border-b pb-2 sm:grid-cols-[140px_1fr]">
      <div id="features-data-health-presentation-detailrow-div-2-xhlkiq" className="text-xs text-on-surface-variant">{label}</div>
      <div id="features-data-health-presentation-detailrow-div-3-vy35jd" className="break-all" dir={ltr ? "ltr" : undefined}>
        {value}
      </div>
    </div>
  );
}
