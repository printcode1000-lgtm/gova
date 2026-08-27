export function InfoRow({ id, label, value, ltr = false }: { label: string; value: string; ltr?: boolean } & { id?: string }) {
  return (
    <div id={id} className="grid gap-1 sm:grid-cols-[10rem_1fr]">
      <dt className="text-xs text-on-surface-variant">{label}</dt>
      <dd className="break-all text-sm font-medium" dir={ltr ? "ltr" : undefined}>{value}</dd>
    </div>
  );
}
