import { Copy } from "lucide-react";

export function AdminCopyValue({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: (value: string) => void | Promise<void>;
}) {
  return (
    <div className="rounded-lg border border-outline-variant/30 bg-surface-container-high p-3">
      <span className="block text-on-surface-variant">{label}</span>
      <code className="mt-1 block break-all font-mono text-primary">
        {value || "-"}
      </code>
      {value ? (
        <button
          type="button"
          onClick={() => void onCopy(value)}
          className="mt-2 inline-flex items-center gap-1 rounded border border-outline-variant px-2 py-1 text-[10px]"
        >
          <Copy className="h-3 w-3" />
          نسخ
        </button>
      ) : null}
    </div>
  );
}
