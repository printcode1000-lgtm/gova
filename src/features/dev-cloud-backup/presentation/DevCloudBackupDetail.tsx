
import { uiAttributes , createOpaqueUiInstanceId} from "@asol/ui-registry-core";export function DevCloudBackupDetail({ id,
  label,
  value,
  ltr,
}: {
  label: string;
  value: string;
  ltr?: boolean;
} & { id?: string }) {
  return (
    <div {...uiAttributes({ uid: "dev-cloud-backup.dev-cloud-backup-detail.div-5kQebF", id: "dev-cloud-backup.dev-cloud-backup-detail.div" })} id={id} className="grid gap-1 sm:grid-cols-[150px_1fr]">
      <div {...uiAttributes({ uid: "dev-cloud-backup.dev-cloud-backup-detail.div.2-b0Ck1B", id: "dev-cloud-backup.dev-cloud-backup-detail.div.2" })} className="text-xs text-on-surface-variant">{label}</div>
      <div {...uiAttributes({ uid: "dev-cloud-backup.dev-cloud-backup-detail.div.3-Wms9J3", id: "dev-cloud-backup.dev-cloud-backup-detail.div.3" })} className="break-all font-medium" dir={ltr ? "ltr" : undefined}>
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
    <div {...uiAttributes({ uid: "dev-cloud-backup.dev-cloud-backup-detail.div.4-Ri5x5n", id: "dev-cloud-backup.dev-cloud-backup-detail.div.4" })} id={id} className="rounded-md border bg-muted p-2">
      <div {...uiAttributes({ uid: "dev-cloud-backup.dev-cloud-backup-detail.div.5-CE4Dhb", id: "dev-cloud-backup.dev-cloud-backup-detail.div.5" })} className="text-xs text-on-surface-variant">{label}</div>
      <div {...uiAttributes({ uid: "dev-cloud-backup.dev-cloud-backup-detail.div.6-AxAWp5", id: "dev-cloud-backup.dev-cloud-backup-detail.div.6" })} className="mt-1 text-lg font-semibold">{value}</div>
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
    <div {...uiAttributes({ uid: "dev-cloud-backup.dev-cloud-backup-detail.div.7-ZDUSj4", id: "dev-cloud-backup.dev-cloud-backup-detail.div.7" })} id={id} className="rounded-md border">
      <div {...uiAttributes({ uid: "dev-cloud-backup.dev-cloud-backup-detail.div.8-tvAV4C", id: "dev-cloud-backup.dev-cloud-backup-detail.div.8" })} className="border-b px-3 py-2 text-xs font-semibold">{title}</div>
      <div {...uiAttributes({ uid: "dev-cloud-backup.dev-cloud-backup-detail.div.9-8jj1Sd", id: "dev-cloud-backup.dev-cloud-backup-detail.div.9" })} className="max-h-48 overflow-y-auto">
        {items.map((item) => (
          <div
            key={item} {...uiAttributes({ uid: "dev-cloud-backup.dev-cloud-backup-detail.div.10-0Ax440", id: "dev-cloud-backup.dev-cloud-backup-detail.div.10" , instance: createOpaqueUiInstanceId("iter-79ad8ce1bc", String(item))})}
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
