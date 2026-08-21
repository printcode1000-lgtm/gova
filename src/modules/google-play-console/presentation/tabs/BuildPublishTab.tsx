"use client";

import { useAdminArabic } from "@/lib/i18n/use-admin-arabic";
import { AndroidReleasePaths } from "../components/AndroidReleasePaths";
import { ReleaseCommandConfirmDialog } from "../components/ReleaseCommandConfirmDialog";
import { ReleaseJobStopDialog } from "../components/ReleaseJobStopDialog";
import { useReleaseJobs } from "../../hooks/use-release-jobs";

export function BuildPublishTab() {
  const { t } = useAdminArabic();
  const jobs = useReleaseJobs();
  const locked = jobs.locked;
  return (
    <section className="space-y-5">
      <ReleaseCommandConfirmDialog
        pending={jobs.pending}
        catalog={jobs.catalog}
        versions={jobs.versions}
        locked={locked}
        t={t}
        onConfirm={(overrides) => void jobs.confirmStart(overrides)}
        onCancel={jobs.dismissStart}
      />
      <ReleaseJobStopDialog
        job={jobs.pendingCancel}
        t={t}
        onConfirm={() => void jobs.confirmCancel()}
        onCancel={jobs.dismissCancel}
      />
      <AndroidReleasePaths
        activeJob={jobs.activeJob}
        busy={locked}
        clearLog={jobs.clearLog}
        jobs={jobs.jobs}
        log={jobs.log}
        readiness={jobs.readiness}
        start={jobs.start}
        cancel={jobs.cancel}
        t={t}
      />
    </section>
  );
}
