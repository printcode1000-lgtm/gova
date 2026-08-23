export function DevCloudBackupDetail({
  label,
  value,
  ltr,
}: {
  label: string;
  value: string;
  ltr?: boolean;
}) {
  return (
    <div className="grid gap-1 sm:grid-cols-[150px_1fr]">
      <div className="text-xs text-on-surface-variant">{label}</div>
      <div className="break-all font-medium" dir={ltr ? "ltr" : undefined}>
        {value}
      </div>
    </div>
  );
}

export function DevCloudBackupSummary({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-md border bg-muted p-2">
      <div className="text-xs text-on-surface-variant">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}

export function DevCloudBackupDiffList({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-md border">
      <div className="border-b px-3 py-2 text-xs font-semibold">{title}</div>
      <div className="max-h-48 overflow-y-auto">
        {items.map((item) => (
          <div
            key={item}
            className="border-b px-3 py-2 text-xs last:border-b-0"
            dir="ltr"
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
