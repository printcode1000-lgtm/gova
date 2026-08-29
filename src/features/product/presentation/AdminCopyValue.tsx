import { Copy } from "lucide-react";
import { uiAttributes } from "@asol/ui-registry-core";

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
    <div {...uiAttributes({ uid: "product.admin-copy-value.div-8IwfSy", id: "product.admin-copy-value.div" })} id={id} className="rounded-lg border border-outline-variant/30 bg-surface-container-high p-3">
      <span {...uiAttributes({ uid: "product.admin-copy-value.span-EV1QyQ", id: "product.admin-copy-value.span" })} className="block text-on-surface-variant">{label}</span>
      <code className="mt-1 block break-all font-mono text-primary">
        {value || "-"}
      </code>
      {value ? (
        <button {...uiAttributes({ uid: "product.admin-copy-value.button-auKrJ1", id: "product.admin-copy-value.button" })}
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
