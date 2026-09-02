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
    return <main id='features-dev-cloud-backup-presentation-devcloudbackuppage-main-1-67ksio' className="p-4 text-sm text-on-surface-variant">جاري التحميل...</main>;
  }

  if (!page.allowedUser) {
    return (
      <main id='features-dev-cloud-backup-presentation-devcloudbackuppage-main-2-bi3wnu' className="mx-auto max-w-2xl p-6">
        <div id='features-dev-cloud-backup-presentation-devcloudbackuppage-div-3-jxzr8y' className="rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
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
    <main id='features-dev-cloud-backup-presentation-devcloudbackuppage-main-4-7unorg' className="mx-auto w-full max-w-7xl space-y-4 p-4 pb-24" dir="rtl">
      <header id='features-dev-cloud-backup-presentation-devcloudbackuppage-header-5-qcdfn0' className="flex flex-wrap items-start justify-between gap-3">
        <div id='features-dev-cloud-backup-presentation-devcloudbackuppage-div-6-rhkit2'>
          <h1 id='features-dev-cloud-backup-presentation-devcloudbackuppage-heading-7-l0979o' className="flex items-center gap-2 text-2xl font-semibold text-on-surface">
            <DatabaseBackup id='features-dev-cloud-backup-presentation-devcloudbackuppage-databasebackup-8-fu0mgo' className="h-6 w-6 text-primary" />
            نسخ سحابة التطوير
          </h1>
          <p id='features-dev-cloud-backup-presentation-devcloudbackuppage-text-9-ey7ymo' className="mt-1 text-sm text-on-surface-variant">
            إنشاء وفحص ومقارنة وتحديث نسخ Turso وCloudflare R2 من بيئة التطوير فقط. كل العمليات تعمل على النسخ المحفوظة المنشأة من النظام.
          </p>
        </div>
        <Button id='features-dev-cloud-backup-presentation-devcloudbackuppage-button-10-nvismr' type="button" variant="outline" onClick={() => void page.load()} disabled={page.busy === "load"}>
          <RefreshCw id='features-dev-cloud-backup-presentation-devcloudbackuppage-refreshcw-11-vviav2' className="h-4 w-4" />
          تحديث
        </Button>
      </header>

      {!devAllowed ? (
        <section id='features-dev-cloud-backup-presentation-devcloudbackuppage-section-12-46matf' className="rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-800">
          <div id='features-dev-cloud-backup-presentation-devcloudbackuppage-div-13-kf8o9v' className="flex items-center gap-2 font-semibold">
            <ShieldAlert id='features-dev-cloud-backup-presentation-devcloudbackuppage-shieldalert-14-jqbx5a' className="h-5 w-5" />
            المديول مقفل خارج بيئة التطوير
          </div>
          <p id='features-dev-cloud-backup-presentation-devcloudbackuppage-text-15-shizbq' className="mt-1 text-sm">
            الحالة الحالية: NODE_ENV={page.state?.environment.nodeEnv || "-"}،
            mode={page.state?.environment.publicMode || "-"}،
            Vercel={page.state?.environment.vercel ? "نعم" : "لا"}.
          </p>
        </section>
      ) : null}

      {page.error ? (
        <section id='features-dev-cloud-backup-presentation-devcloudbackuppage-section-16-dyydxy' className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {page.error}
        </section>
      ) : null}
      {page.notice ? (
        <section id='features-dev-cloud-backup-presentation-devcloudbackuppage-section-17-6mdn5g' className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {page.notice}
        </section>
      ) : null}
      {page.operationStatus ? (
        <DevCloudBackupOperationStatusPanel status={page.operationStatus} />
      ) : null}

      <section id='features-dev-cloud-backup-presentation-devcloudbackuppage-section-18-6xvqig' className="grid gap-4 lg:grid-cols-[1fr_1fr]">
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
