"use client";

import { DatabaseBackup, RefreshCw, ShieldAlert } from "lucide-react";

import { Button } from "@/shared/ui/button";

import { DevCloudBackupCreateCard } from "./DevCloudBackupCreateCard";
import { DevCloudBackupOperationStatusPanel } from "./DevCloudBackupOperationStatusPanel";
import { DevCloudBackupResultsCard } from "./DevCloudBackupResultsCard";
import { DevCloudBackupSavedList } from "./DevCloudBackupSavedList";
import { useDevCloudBackupPage } from "./use-dev-cloud-backup-page";

export function DevCloudBackupPage() {
  const page = useDevCloudBackupPage();

  if (page.isLoading) {
    return <main className="p-4 text-sm text-on-surface-variant">جاري التحميل...</main>;
  }

  if (!page.allowedUser) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
          هذه الصفحة متاحة للسوبر أدمن فقط.
        </div>
      </main>
    );
  }

  const devAllowed = page.state?.environment.allowed ?? false;
  const savedOperationBusy =
    page.busy.startsWith("inspect-saved:") ||
    page.busy.startsWith("compare-saved:") ||
    page.busy.startsWith("update-saved:") ||
    page.busy.startsWith("restore-saved:");

  return (
    <main className="mx-auto w-full max-w-7xl space-y-4 p-4 pb-24" dir="rtl">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-on-surface">
            <DatabaseBackup className="h-6 w-6 text-primary" />
            نسخ سحابة التطوير
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            إنشاء وفحص ومقارنة وتحديث نسخ Turso وCloudflare R2 من بيئة التطوير فقط. كل العمليات تعمل على النسخ المحفوظة المنشأة من النظام.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => void page.load()} disabled={page.busy === "load"}>
          <RefreshCw className="h-4 w-4" />
          تحديث
        </Button>
      </header>

      {!devAllowed ? (
        <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-800">
          <div className="flex items-center gap-2 font-semibold">
            <ShieldAlert className="h-5 w-5" />
            المديول مقفل خارج بيئة التطوير
          </div>
          <p className="mt-1 text-sm">
            الحالة الحالية: NODE_ENV={page.state?.environment.nodeEnv || "-"}،
            mode={page.state?.environment.publicMode || "-"}،
            Vercel={page.state?.environment.vercel ? "نعم" : "لا"}.
          </p>
        </section>
      ) : null}

      {page.error ? (
        <section className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {page.error}
        </section>
      ) : null}
      {page.notice ? (
        <section className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {page.notice}
        </section>
      ) : null}
      {page.operationStatus ? (
        <DevCloudBackupOperationStatusPanel status={page.operationStatus} />
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <DevCloudBackupCreateCard
          created={page.created}
          devAllowed={devAllowed}
          busy={page.busy}
          onCreate={() => void page.createBackup()}
        />
        <DevCloudBackupResultsCard
          diff={page.diff}
          updatedZip={page.updatedZip}
          inspection={page.inspection}
          onDownload={(fileName) => void page.downloadBackup(fileName)}
        />
      </section>

      <DevCloudBackupSavedList
        backups={page.state?.backups ?? []}
        busy={page.busy}
        devAllowed={devAllowed}
        savedOperationBusy={savedOperationBusy}
        operationStatus={page.operationStatus}
        onDownload={(fileName) => void page.downloadBackup(fileName)}
        onInspect={(fileName) => void page.inspectSavedBackup(fileName)}
        onCompare={(fileName) => void page.compareSavedBackup(fileName)}
        onUpdate={(fileName) => void page.updateSavedBackup(fileName)}
        onRestore={(fileName, mode) => void page.restoreSavedBackup(fileName, mode)}
        onDelete={page.stageSavedBackupDelete}
      />
    </main>
  );
}
