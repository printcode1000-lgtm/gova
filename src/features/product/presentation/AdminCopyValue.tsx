import { Copy } from "lucide-react";

export function AdminCopyValue({ id,
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: (value: string) => void | Promise<void>;
} & { id?: string }) {
  return (
    <div id={id} className="rounded-lg border border-outline-variant/30 bg-surface-container-high p-3">
      <span id={id ? `${id}-text-2-4uec6j` : undefined} className="block text-on-surface-variant">{label}</span>
      <code id={id ? `${id}-code-3-l0wdnj` : undefined} className="mt-1 block break-all font-mono text-primary">
        {value || "-"}
      </code>
      {value ? (
        <button id={id ? `${id}-button-4-c1fpme` : undefined}
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
