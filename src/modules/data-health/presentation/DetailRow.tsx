export function DetailRow({
  label,
  value,
  ltr,
}: {
  label: string;
  value: string;
  ltr?: boolean;
}) {
  return (
    <div className="grid gap-1 border-b pb-2 sm:grid-cols-[140px_1fr]">
      <div className="text-xs text-on-surface-variant">{label}</div>
      <div className="break-all" dir={ltr ? "ltr" : undefined}>
        {value}
      </div>
    </div>
  );
}
