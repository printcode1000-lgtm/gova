import { HardDrive, Layers3 } from "lucide-react";

import type { DataHealthReport } from "@asol/data-health-core";

import {
  topologyStatusClass,
  topologyStatusLabel,
} from "./data-health-labels";

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
    <section id="data-health.data-health-topology-panel.section" className="overflow-hidden rounded-md border bg-surface" dir="rtl">
      <div id="data-health.data-health-topology-panel.div" className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
        <div id="data-health.data-health-topology-panel.div.2" className="flex items-center gap-2 text-sm font-semibold">
          <Layers3 id="data-health.data-health-topology-panel.layers3" className="h-4 w-4 text-primary" />
          خريطة قواعد البيانات والتخزين الفعلية
        </div>
        <div id="data-health.data-health-topology-panel.div.3" className="text-xs text-on-surface-variant">
          فحص اتصال مستقل لكل قاعدة ومخزن أثناء هذه العملية
        </div>
      </div>

      <div id="data-health.data-health-topology-panel.div.4" className="grid divide-y lg:grid-cols-2 lg:divide-x lg:divide-y-0" dir="rtl">
        <div id="data-health.data-health-topology-panel.div.5" className="p-3">
          <TopologyDatabaseGroup id="data-health.data-health-topology-panel.topology-database-group" label="قواعد النظام الأساسية" items={coreDatabases} />
          <TopologyDatabaseGroup id="data-health.data-health-topology-panel.topology-database-group.2" label={`قواعد ملفات التعريف (${profileShards.length})`} items={profileShards} />
          <TopologyDatabaseGroup id="data-health.data-health-topology-panel.topology-database-group.3" label={`قواعد الطلبات (${orderShards.length})`} items={orderShards} />
        </div>

        <div id="data-health.data-health-topology-panel.div.6" className="p-3">
          <div id="data-health.data-health-topology-panel.div.7" className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <HardDrive id="data-health.data-health-topology-panel.hard-drive" className="h-4 w-4 text-primary" />
            مخازن الصور
          </div>
          <div id="data-health.data-health-topology-panel.div.8" className="space-y-2">
            {report.topology.storage.map((storage) => (
              <div key={storage.id} className="rounded-md border p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-mono text-sm font-semibold" dir="ltr">
                      {storage.id}
                    </div>
                    <div className="mt-1 text-xs text-on-surface-variant">
                      {storage.kind === "primary-r2"
                        ? "R2 الجديد: صور الحساب والمحتوى والطلبات الخاصة"
                        : storage.kind === "product-r2"
                          ? "R2 القديم: صور المنتجات فقط"
                          : "النسخة المحلية الموحدة للصور"}
                    </div>
                  </div>
                  <span className={`rounded border px-2 py-0.5 text-xs ${topologyStatusClass(storage.status)}`}>
                    {topologyStatusLabel(storage.status)}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                  <div>
                    <div className="text-on-surface-variant">ملفات مرجعية / مكتشفة</div>
                    <div className="mt-0.5 font-medium">
                      {storage.referencedObjects} / {storage.discoveredObjects}
                    </div>
                  </div>
                  <div>
                    <div className="text-on-surface-variant">أنواع الحفظ</div>
                    <div className="mt-0.5 break-words font-mono" dir="ltr">
                      {storage.profiles.join(", ") || "-"}
                    </div>
                  </div>
                </div>
                {storage.cloudFolders.length > 0 ? (
                  <div className="mt-2 break-all text-xs text-on-surface-variant" dir="ltr">
                    {storage.cloudFolders.join(" | ")}
                  </div>
                ) : null}
                {storage.message ? (
                  <div className="mt-2 break-words text-xs text-amber-800">
                    {storage.message}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          <div id="data-health.data-health-topology-panel.div.9" className="mt-4">
            <div id="data-health.data-health-topology-panel.div.10" className="mb-2 text-sm font-semibold">كل مصادر الصور المفحوصة</div>
            <div id="data-health.data-health-topology-panel.div.11" className="overflow-hidden rounded-md border">
              {report.topology.imageSources.map((source) => (
                <div
                  key={`${source.database}.${source.table}`}
                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b p-2.5 text-sm last:border-b-0"
                >
                  <div className="min-w-0">
                    <div className="font-mono font-medium" dir="ltr">
                      {source.database}.{source.table}
                    </div>
                    <div className="mt-1 break-words text-xs text-on-surface-variant" dir="ltr">
                      {source.columns.join(", ")}
                    </div>
                  </div>
                  <div className="text-end text-xs text-on-surface-variant">
                    <div>
                      {source.ownership === "owned"
                        ? "ملف مُدار"
                        : source.ownership === "shared-snapshot"
                          ? "لقطة مشتركة"
                          : source.ownership === "static-asset"
                            ? "ملف ثابت"
                            : "مهمة حذف"}
                    </div>
                    {source.storageProfileId ? (
                      <div className="mt-1 font-mono" dir="ltr">
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
    <div id={id} className="mb-4 last:mb-0">
      <div className="mb-2 text-xs font-semibold text-on-surface-variant">
        {label}
      </div>
      <div className="overflow-hidden rounded-md border">
        {items.map((database) => (
          <div
            key={database.id}
            className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b p-2.5 text-sm last:border-b-0"
          >
            <div className="min-w-0">
              <div className="font-mono font-medium" dir="ltr">
                {database.id}
              </div>
              <div className="mt-1 line-clamp-2 text-xs text-on-surface-variant" dir="ltr">
                {database.tables.length > 0
                  ? database.tables.join(", ")
                  : "لا توجد جداول قابلة للعرض"}
              </div>
              {database.message ? (
                <div className="mt-1 break-words text-xs text-red-700">
                  {database.message}
                </div>
              ) : null}
            </div>
            <span className={`h-fit whitespace-nowrap rounded border px-2 py-0.5 text-xs ${topologyStatusClass(database.status)}`}>
              {topologyStatusLabel(database.status)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
