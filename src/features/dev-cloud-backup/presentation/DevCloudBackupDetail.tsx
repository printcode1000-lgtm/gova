
export function DevCloudBackupDetail({ id,
  label,
  value,
  ltr,
}: {
  label: string;
  value: string;
  ltr?: boolean;
} & { id?: string }) {
  return (
    <div id={id} className="grid gap-1 sm:grid-cols-[150px_1fr]">
      <div id={id ? `${id}-div-2-wnk3u2` : undefined} className="text-xs text-on-surface-variant">{label}</div>
      <div id={id ? `${id}-div-3-lacse1` : undefined} className="break-all font-medium" dir={ltr ? "ltr" : undefined}>
        {value}
      </div>
    </div>
  );
}

export function DevCloudBackupSummary({ id,
  label,
  value,
}: {
  label: string;
  value: number;
} & { id?: string }) {
  return (
    <div id={id} className="rounded-md border bg-muted p-2">
      <div id={id ? `${id}-div-5-gmo6zb` : undefined} className="text-xs text-on-surface-variant">{label}</div>
      <div id={id ? `${id}-div-6-prj1mi` : undefined} className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}

export function DevCloudBackupDiffList({ id,
  title,
  items,
}: {
  title: string;
  items: string[];
} & { id?: string }) {
  return (
    <div id={id} className="rounded-md border">
      <div id={id ? `${id}-div-8-iidt3h` : undefined} className="border-b px-3 py-2 text-xs font-semibold">{title}</div>
      <div id={id ? `${id}-div-9-dht2yk` : undefined} className="max-h-48 overflow-y-auto">
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
