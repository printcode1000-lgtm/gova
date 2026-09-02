"use client";

import { Ban, CheckCircle2, ClipboardCopy, CloudDownload, RefreshCw } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { useAdminArabic } from "@/shared/i18n/use-admin-arabic";
import { useOtaAdmin } from "../hooks/use-ota-admin";
import { useOtaRolloutPageSave } from "../hooks/use-ota-rollout-page-save";
import { Metric } from "../components/Metric";
import { OtaReleaseChanges } from "../components/OtaReleaseChanges";
import {
  OtaAdoption,
  OtaHistoryAndAudit,
  OtaReleaseFiles,
} from "../components/OtaReleaseReports";

export function OtaReleasesTab() {
  const { t } = useAdminArabic();
  const ota = useOtaAdmin();
  const current = ota.dashboard?.current;
  const release = current?.release;
  useOtaRolloutPageSave(ota, true, release?.rolloutPercentage);
  return (
    <section id='google-play-console-presentation-tabs-otareleasestab-section-1-tzgptc' className="space-y-4">
      <div id='google-play-console-presentation-tabs-otareleasestab-div-2-rjtnrc' className="flex flex-wrap justify-end gap-2">
        <Button
          id='google-play-console-presentation-tabs-otareleasestab-button-3-xr442y'
          variant="outline"
          disabled={ota.busy}
          onClick={() => void ota.refresh()}
        >
          <RefreshCw id='google-play-console-presentation-tabs-otareleasestab-refreshcw-4-jqyerv' className="h-4 w-4" />
          {t("releaseConsole.actions.refresh")}
        </Button>
        <Button
          id='google-play-console-presentation-tabs-otareleasestab-button-5-jw8mdh'
          variant="secondary"
          disabled={ota.busy}
          onClick={() => void ota.download()}
        >
          <CloudDownload id='google-play-console-presentation-tabs-otareleasestab-clouddownload-6-ulwhkn' className="h-4 w-4" />
          {t("releaseConsole.ota.downloadTest")}
        </Button>
      </div>
      {ota.message ? (
        <div id='google-play-console-presentation-tabs-otareleasestab-div-7-sqhjjy' className="rounded-md bg-muted p-3 text-sm">
          {t(ota.message)}
        </div>
      ) : null}
      {ota.progress ? (
        <div id='google-play-console-presentation-tabs-otareleasestab-div-8-yw8tts' className="rounded-md border bg-surface p-3">
          <div id='google-play-console-presentation-tabs-otareleasestab-div-9-huslff' className="flex justify-between text-sm">
            <span id='google-play-console-presentation-tabs-otareleasestab-text-10-sd03tu'>
              {ota.progress.detail || ota.progress.statusKey}
            </span>
            <strong id="google-play-console-presentation-tabs-otareleasestab-strong-11-j1czrv">{ota.progress.progress}%</strong>
          </div>
          <div
            id='google-play-console-presentation-tabs-otareleasestab-div-12-fkhuk7'
            className="mt-2 h-2 overflow-hidden rounded-sm bg-muted"
          >
            <div
              id='google-play-console-presentation-tabs-otareleasestab-div-13-l3jgdk'
              className="h-full bg-primary"
              style={{ width: `${ota.progress.progress}%` }}
            />
          </div>
        </div>
      ) : null}
      {ota.dashboard && !release ? (
        <div
          id='google-play-console-presentation-tabs-otareleasestab-div-14-fu1hzy'
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {t("releaseConsole.ota.loadFailed")}
        </div>
      ) : release && current?.manifest && ota.dashboard ? (
        <>
          <div
            id='google-play-console-presentation-tabs-otareleasestab-div-15-i9vgvb'
            className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
          >
            <Metric
              id='google-play-console-presentation-tabs-otareleasestab-metric-16-bctfmw'
              label={t("releaseConsole.ota.currentVersion")}
              value={release.version}
              detail={release.releaseId}
            />
            <Metric
              id='google-play-console-presentation-tabs-otareleasestab-metric-17-l2dpkb'
              label={t("releaseConsole.ota.approval")}
              value={t(release.approved ? "releaseConsole.common.yes" : "releaseConsole.common.no")}
            />
            <Metric
              id='google-play-console-presentation-tabs-otareleasestab-metric-18-qhlvjd'
              label={t("releaseConsole.ota.size")}
              value={release.size}
              detail={`${release.fileCount} ${t("releaseConsole.ota.files")}`}
            />
            <Metric
              id='google-play-console-presentation-tabs-otareleasestab-metric-19-mnjxkx'
              label={t("releaseConsole.ota.mandatory")}
              value={t(release.mandatory ? "releaseConsole.common.yes" : "releaseConsole.common.no")}
            />
          </div>
          <section
            id='google-play-console-presentation-tabs-otareleasestab-section-20-tooppk'
            className="flex flex-wrap items-end gap-3 rounded-md border bg-surface p-4"
          >
            <label id='google-play-console-presentation-tabs-otareleasestab-label-21-bpqg9p' className="grid gap-1 text-sm">
              <span id='google-play-console-presentation-tabs-otareleasestab-text-22-hv22oe'>{t("releaseConsole.ota.rollout")}</span>
              <Input
                id='google-play-console-presentation-tabs-otareleasestab-input-23-glifoq'
                className="w-28"
                type="number"
                min={release.rolloutPercentage}
                max="100"
                value={ota.rollout}
                onChange={(event) => ota.setRollout(Number(event.target.value))}
              />
            </label>
            <Button
              id='google-play-console-presentation-tabs-otareleasestab-button-24-e29ssp'
              variant={release.approved ? "destructive" : "default"}
              disabled={ota.busy}
              onClick={() => void ota.changeApproval(!release.approved)}
            >
              {release.approved ? (
                <Ban id='google-play-console-presentation-tabs-otareleasestab-ban-25-v5lzgv' className="h-4 w-4" />
              ) : (
                <CheckCircle2 id='google-play-console-presentation-tabs-otareleasestab-checkcircle2-26-hq4dei' className="h-4 w-4" />
              )}
              {t(release.approved ? "releaseConsole.ota.revoke" : "releaseConsole.ota.approve")}
            </Button>
            <Button
              id='google-play-console-presentation-tabs-otareleasestab-button-27-yfj0h3'
              variant="outline"
              onClick={() => void ota.copyManifest()}
            >
              <ClipboardCopy id='google-play-console-presentation-tabs-otareleasestab-clipboardcopy-28-sqovbm' className="h-4 w-4" />
              {t("releaseConsole.ota.copyManifest")}
            </Button>
          </section>
          <OtaReleaseFiles
            files={current.manifest.files}
            title={t("releaseConsole.ota.releaseFiles")}
          />
          <OtaReleaseChanges
            diff={ota.diff}
            history={ota.dashboard.history}
            currentId={release.releaseId}
            baseId={ota.baseReleaseId}
            onBaseChange={ota.setBaseReleaseId}
            emptyText={t("releaseConsole.empty")}
          />
          <OtaAdoption
            adoption={ota.dashboard.adoption}
            title={t("releaseConsole.ota.adoption")}
            emptyText={t("releaseConsole.empty")}
          />
          <OtaHistoryAndAudit
            history={ota.dashboard.history}
            audit={ota.dashboard.audit}
            historyTitle={t("releaseConsole.ota.history")}
            auditTitle={t("releaseConsole.ota.audit")}
            auditActionLabel={(action) => t(`releaseConsole.ota.auditAction.${action}`)}
          />
        </>
      ) : ota.message ? null : (
        <div id='google-play-console-presentation-tabs-otareleasestab-div-29-bkgmtq' className="p-4 text-sm">
          {t("releaseConsole.loading")}
        </div>
      )}
    </section>
  );
}
