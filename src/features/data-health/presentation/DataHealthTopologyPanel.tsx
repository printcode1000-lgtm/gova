import { HardDrive, Layers3 } from "lucide-react";

import type { DataHealthReport } from "@asol/data-health-core";

import {
  topologyStatusClass,
  topologyStatusLabel,
} from "./data-health-labels";
import { uiAttributes } from "@asol/ui-registry-core";

export function DataHealthTopologyPanel({ report }: { report: DataHealthReport }) {
  const profileShards = report.topology.databases.filter(
    (database) => database.kind === "profile-shard",
  );
  const orderShards = report.topology.databases.filter(
    (database) => database.kind === "order-shard",
  );
  const coreDatabases = report.topology.databases.filter(
    (database) => database.kind === "core",
  );

  return (
    <section {...uiAttributes({ uid: "data-health.data-health-topology-panel.section.2-2pVN0j", id: "data-health.data-health-topology-panel.section.2" })} id="data-health.data-health-topology-panel.section" className="overflow-hidden rounded-md border bg-surface" dir="rtl">
      <div {...uiAttributes({ uid: "data-health.data-health-topology-panel.div.12-f69Cr3", id: "data-health.data-health-topology-panel.div.12" })} id="data-health.data-health-topology-panel.div" className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
        <div {...uiAttributes({ uid: "data-health.data-health-topology-panel.div.13-4HaDh5", id: "data-health.data-health-topology-panel.div.13" })} id="data-health.data-health-topology-panel.div.2" className="flex items-center gap-2 text-sm font-semibold">
          <Layers3 id="data-health.data-health-topology-panel.layers3" className="h-4 w-4 text-primary" />
          خريطة قواعد البيانات والتخزين الفعلية
        </div>
        <div {...uiAttributes({ uid: "data-health.data-health-topology-panel.div.14-78j7JF", id: "data-health.data-health-topology-panel.div.14" })} id="data-health.data-health-topology-panel.div.3" className="text-xs text-on-surface-variant">
          فحص اتصال مستقل لكل قاعدة ومخزن أثناء هذه العملية
        </div>
      </div>

      <div {...uiAttributes({ uid: "data-health.data-health-topology-panel.div.15-Ms4MFq", id: "data-health.data-health-topology-panel.div.15" })} id="data-health.data-health-topology-panel.div.4" className="grid divide-y lg:grid-cols-2 lg:divide-x lg:divide-y-0" dir="rtl">
        <div {...uiAttributes({ uid: "data-health.data-health-topology-panel.div.16-aEe8G4", id: "data-health.data-health-topology-panel.div.16" })} id="data-health.data-health-topology-panel.div.5" className="p-3">
          <TopologyDatabaseGroup id="data-health.data-health-topology-panel.topology-database-group" label="قواعد النظام الأساسية" items={coreDatabases} />
          <TopologyDatabaseGroup id="data-health.data-health-topology-panel.topology-database-group.2" label={`قواعد ملفات التعريف (${profileShards.length})`} items={profileShards} />
          <TopologyDatabaseGroup id="data-health.data-health-topology-panel.topology-database-group.3" label={`قواعد الطلبات (${orderShards.length})`} items={orderShards} />
        </div>

        <div {...uiAttributes({ uid: "data-health.data-health-topology-panel.div.17-6EaScW", id: "data-health.data-health-topology-panel.div.17" })} id="data-health.data-health-topology-panel.div.6" className="p-3">
          <div {...uiAttributes({ uid: "data-health.data-health-topology-panel.div.18-rAWKH6", id: "data-health.data-health-topology-panel.div.18" })} id="data-health.data-health-topology-panel.div.7" className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <HardDrive id="data-health.data-health-topology-panel.hard-drive" className="h-4 w-4 text-primary" />
            مخازن الصور
          </div>
          <div {...uiAttributes({ uid: "data-health.data-health-topology-panel.div.19-y7UG3t", id: "data-health.data-health-topology-panel.div.19" })} id="data-health.data-health-topology-panel.div.8" className="space-y-2">
            {report.topology.storage.map((storage) => (
              <div key={storage.id} {...uiAttributes({ uid: "data-health.data-health-topology-panel.div.20-r1OsKa", id: "data-health.data-health-topology-panel.div.20" })} className="rounded-md border p-3">
                <div {...uiAttributes({ uid: "data-health.data-health-topology-panel.div.21-0zzSkI", id: "data-health.data-health-topology-panel.div.21" })} className="flex flex-wrap items-start justify-between gap-2">
                  <div {...uiAttributes({ uid: "data-health.data-health-topology-panel.div.22-XqR6vN", id: "data-health.data-health-topology-panel.div.22" })}>
                    <div {...uiAttributes({ uid: "data-health.data-health-topology-panel.div.23-I54HRK", id: "data-health.data-health-topology-panel.div.23" })} className="font-mono text-sm font-semibold" dir="ltr">
                      {storage.id}
                    </div>
                    <div {...uiAttributes({ uid: "data-health.data-health-topology-panel.div.24-9M3nQ0", id: "data-health.data-health-topology-panel.div.24" })} className="mt-1 text-xs text-on-surface-variant">
                      {storage.kind === "primary-r2"
                        ? "R2 الجديد: صور الحساب والمحتوى والطلبات الخاصة"
                        : storage.kind === "product-r2"
                          ? "R2 القديم: صور المنتجات فقط"
                          : "النسخة المحلية الموحدة للصور"}
                    </div>
                  </div>
                  <span {...uiAttributes({ uid: "data-health.data-health-topology-panel.span-Gl0MKF", id: "data-health.data-health-topology-panel.span" })} className={`rounded border px-2 py-0.5 text-xs ${topologyStatusClass(storage.status)}`}>
                    {topologyStatusLabel(storage.status)}
                  </span>
                </div>
                <div {...uiAttributes({ uid: "data-health.data-health-topology-panel.div.25-U95Vuo", id: "data-health.data-health-topology-panel.div.25" })} className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                  <div {...uiAttributes({ uid: "data-health.data-health-topology-panel.div.26-9O5D2m", id: "data-health.data-health-topology-panel.div.26" })}>
                    <div {...uiAttributes({ uid: "data-health.data-health-topology-panel.div.27-N8tHrw", id: "data-health.data-health-topology-panel.div.27" })} className="text-on-surface-variant">ملفات مرجعية / مكتشفة</div>
                    <div {...uiAttributes({ uid: "data-health.data-health-topology-panel.div.28-fjZ8tC", id: "data-health.data-health-topology-panel.div.28" })} className="mt-0.5 font-medium">
                      {storage.referencedObjects} / {storage.discoveredObjects}
                    </div>
                  </div>
                  <div {...uiAttributes({ uid: "data-health.data-health-topology-panel.div.29-ZGa3FP", id: "data-health.data-health-topology-panel.div.29" })}>
                    <div {...uiAttributes({ uid: "data-health.data-health-topology-panel.div.30-wMG1HT", id: "data-health.data-health-topology-panel.div.30" })} className="text-on-surface-variant">أنواع الحفظ</div>
                    <div {...uiAttributes({ uid: "data-health.data-health-topology-panel.div.31-mLxIO4", id: "data-health.data-health-topology-panel.div.31" })} className="mt-0.5 break-words font-mono" dir="ltr">
                      {storage.profiles.join(", ") || "-"}
                    </div>
                  </div>
                </div>
                {storage.cloudFolders.length > 0 ? (
                  <div {...uiAttributes({ uid: "data-health.data-health-topology-panel.div.32-Arr9GU", id: "data-health.data-health-topology-panel.div.32" })} className="mt-2 break-all text-xs text-on-surface-variant" dir="ltr">
                    {storage.cloudFolders.join(" | ")}
                  </div>
                ) : null}
                {storage.message ? (
                  <div {...uiAttributes({ uid: "data-health.data-health-topology-panel.div.33-4nHCb4", id: "data-health.data-health-topology-panel.div.33" })} className="mt-2 break-words text-xs text-amber-800">
                    {storage.message}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          <div {...uiAttributes({ uid: "data-health.data-health-topology-panel.div.34-aov7CB", id: "data-health.data-health-topology-panel.div.34" })} id="data-health.data-health-topology-panel.div.9" className="mt-4">
            <div {...uiAttributes({ uid: "data-health.data-health-topology-panel.div.35-2NAxI3", id: "data-health.data-health-topology-panel.div.35" })} id="data-health.data-health-topology-panel.div.10" className="mb-2 text-sm font-semibold">كل مصادر الصور المفحوصة</div>
            <div {...uiAttributes({ uid: "data-health.data-health-topology-panel.div.36-SN76VS", id: "data-health.data-health-topology-panel.div.36" })} id="data-health.data-health-topology-panel.div.11" className="overflow-hidden rounded-md border">
              {report.topology.imageSources.map((source) => (
                <div
                  key={`${source.database}.${source.table}`} {...uiAttributes({ uid: "data-health.data-health-topology-panel.div.37-fY2JI8", id: "data-health.data-health-topology-panel.div.37" })}
                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b p-2.5 text-sm last:border-b-0"
                >
                  <div {...uiAttributes({ uid: "data-health.data-health-topology-panel.div.38-m6zUPB", id: "data-health.data-health-topology-panel.div.38" })} className="min-w-0">
                    <div {...uiAttributes({ uid: "data-health.data-health-topology-panel.div.39-8HVyuQ", id: "data-health.data-health-topology-panel.div.39" })} className="font-mono font-medium" dir="ltr">
                      {source.database}.{source.table}
                    </div>
                    <div {...uiAttributes({ uid: "data-health.data-health-topology-panel.div.40-1KLRFU", id: "data-health.data-health-topology-panel.div.40" })} className="mt-1 break-words text-xs text-on-surface-variant" dir="ltr">
                      {source.columns.join(", ")}
                    </div>
                  </div>
                  <div {...uiAttributes({ uid: "data-health.data-health-topology-panel.div.41-t78TRB", id: "data-health.data-health-topology-panel.div.41" })} className="text-end text-xs text-on-surface-variant">
                    <div {...uiAttributes({ uid: "data-health.data-health-topology-panel.div.42-8KTXIz", id: "data-health.data-health-topology-panel.div.42" })}>
                      {source.ownership === "owned"
                        ? "ملف مُدار"
                        : source.ownership === "shared-snapshot"
                          ? "لقطة مشتركة"
                          : source.ownership === "static-asset"
                            ? "ملف ثابت"
                            : "مهمة حذف"}
                    </div>
                    {source.storageProfileId ? (
                      <div {...uiAttributes({ uid: "data-health.data-health-topology-panel.div.43-JWV6xT", id: "data-health.data-health-topology-panel.div.43" })} className="mt-1 font-mono" dir="ltr">
                        {source.storageProfileId}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TopologyDatabaseGroup({ id,
  label,
  items,
}: {
  label: string;
  items: DataHealthReport["topology"]["databases"];
} & { id?: string }) {
  return (
    <div {...uiAttributes({ uid: "data-health.data-health-topology-panel.div.44-VAZsW4", id: "data-health.data-health-topology-panel.div.44" })} id={id} className="mb-4 last:mb-0">
      <div {...uiAttributes({ uid: "data-health.data-health-topology-panel.div.45-gwQ02N", id: "data-health.data-health-topology-panel.div.45" })} className="mb-2 text-xs font-semibold text-on-surface-variant">
        {label}
      </div>
      <div {...uiAttributes({ uid: "data-health.data-health-topology-panel.div.46-0WK5XZ", id: "data-health.data-health-topology-panel.div.46" })} className="overflow-hidden rounded-md border">
        {items.map((database) => (
          <div
            key={database.id} {...uiAttributes({ uid: "data-health.data-health-topology-panel.div.47-tYq33J", id: "data-health.data-health-topology-panel.div.47" })}
            className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b p-2.5 text-sm last:border-b-0"
          >
            <div {...uiAttributes({ uid: "data-health.data-health-topology-panel.div.48-s2U1F2", id: "data-health.data-health-topology-panel.div.48" })} className="min-w-0">
              <div {...uiAttributes({ uid: "data-health.data-health-topology-panel.div.49-M7e8Yg", id: "data-health.data-health-topology-panel.div.49" })} className="font-mono font-medium" dir="ltr">
                {database.id}
              </div>
              <div {...uiAttributes({ uid: "data-health.data-health-topology-panel.div.50-gAO7bR", id: "data-health.data-health-topology-panel.div.50" })} className="mt-1 line-clamp-2 text-xs text-on-surface-variant" dir="ltr">
                {database.tables.length > 0
                  ? database.tables.join(", ")
                  : "لا توجد جداول قابلة للعرض"}
              </div>
              {database.message ? (
                <div {...uiAttributes({ uid: "data-health.data-health-topology-panel.div.51-s7R6K6", id: "data-health.data-health-topology-panel.div.51" })} className="mt-1 break-words text-xs text-red-700">
                  {database.message}
                </div>
              ) : null}
            </div>
            <span {...uiAttributes({ uid: "data-health.data-health-topology-panel.span.2-dHh90p", id: "data-health.data-health-topology-panel.span.2" })} className={`h-fit whitespace-nowrap rounded border px-2 py-0.5 text-xs ${topologyStatusClass(database.status)}`}>
              {topologyStatusLabel(database.status)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
