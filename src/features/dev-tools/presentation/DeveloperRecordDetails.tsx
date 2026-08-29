
import { uiAttributes } from "@asol/ui-registry-core";type DetailRecord = Record<string, unknown>;

function formatDetailValue(value: unknown) {
  if (value === null) return "null";
  if (value === undefined) return "-";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

export function SelectedRecordDetails({ id,
  title,
  record,
}: {
  title: string;
  record: DetailRecord | null;
} & { id?: string }) {
  return (
    <div {...uiAttributes({ uid: "dev-tools.developer-record-details.div-7MYuRd", id: "dev-tools.developer-record-details.div" })} id={id} className="overflow-hidden rounded-xl border bg-background/70">
      <h3 {...uiAttributes({ uid: "dev-tools.developer-record-details.h3-hHMT8S", id: "dev-tools.developer-record-details.h3" })} className="border-b px-4 py-3 text-sm font-bold">{title}</h3>
      {record ? (
        <dl className="divide-y text-sm">
          {Object.entries(record).map(([key, value]) => (
            <div
              key={key} {...uiAttributes({ uid: "dev-tools.developer-record-details.div.2-E3saZY", id: "dev-tools.developer-record-details.div.2" })}
              className="grid gap-1 px-4 py-3 sm:grid-cols-[minmax(130px,0.4fr)_1fr] sm:gap-4"
            >
              <dt
                className="font-mono text-xs font-semibold text-primary"
                dir="ltr"
              >
                {key}
              </dt>
              <dd
                className="break-all whitespace-pre-wrap text-muted-foreground"
                dir="auto"
              >
                {formatDetailValue(value)}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p {...uiAttributes({ uid: "dev-tools.developer-record-details.p-cp3h4Z", id: "dev-tools.developer-record-details.p" })} className="px-4 py-5 text-sm text-muted-foreground">
          لم يتم الاختيار بعد.
        </p>
      )}
    </div>
  );
}

export type { DetailRecord };
