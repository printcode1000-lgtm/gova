import { Copy } from "lucide-react";
import { createOpaqueUiInstanceId, uiAttributes, type UiInstanceId } from "@asol/ui-registry-core";

export function AdminCopyValue({ id,
  label,
  value,
  onCopy,
  instance,
}: {
  label: string;
  value: string;
  onCopy: (value: string) => void | Promise<void>;
  instance?: UiInstanceId;
} & { id?: string }) {
  const resolvedInstance = id ? createOpaqueUiInstanceId("admin-copy", id) : instance;
  return (
    <div {...uiAttributes({ uid: "product.admin-copy-value.div-8IwfSy", id: "product.admin-copy-value.div", instance: resolvedInstance })} id={id} className="rounded-lg border border-outline-variant/30 bg-surface-container-high p-3">
      <span {...uiAttributes({ uid: "product.admin-copy-value.span-EV1QyQ", id: "product.admin-copy-value.span", instance: resolvedInstance })} className="block text-on-surface-variant">{label}</span>
      <code {...uiAttributes({ uid: "product.admin-copy-value.code-U2hPF4", id: "product.admin-copy-value.code", instance: resolvedInstance })} className="mt-1 block break-all font-mono text-primary">
        {value || "-"}
      </code>
      {value ? (
        <button {...uiAttributes({ uid: "product.admin-copy-value.button-auKrJ1", id: "product.admin-copy-value.button", instance: resolvedInstance })}
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
