"use client";

import { Ban, CheckCircle2, ClipboardCopy, CloudDownload, RefreshCw } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { useAdminArabic } from "@/shared/i18n/use-admin-arabic";
import { useOtaAdmin } from "../hooks/use-ota-admin";
import { useOtaRolloutPageSave } from "../hooks/use-ota-rollout-page-save";
import { Metric } from "../components/Metric";
import { OtaReleaseChanges } from "../components/OtaReleaseChanges";

export function OtaReleasesTab() {
  const { t } = useAdminArabic();
  const ota = useOtaAdmin();
  const current = ota.dashboard?.current;
  const release = current?.release;
  useOtaRolloutPageSave(ota, true, release?.rolloutPercentage);
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2">
        <Button ui={{ uid: "release-console.ota.refresh-WPqR9E", id: "release-console.ota.refresh", kind: "action", action: "refresh-ota", part: "toolbar" }} variant="outline" disabled={ota.busy} onClick={() => void ota.refresh()}>
          <RefreshCw className="h-4 w-4" />{t("releaseConsole.actions.refresh")}
        </Button>
        <Button ui={{ uid: "release-console.ota.download-test-633aRH", id: "release-console.ota.download-test", kind: "action", action: "download-test-bundle", part: "toolbar" }} variant="secondary" disabled={ota.busy} onClick={() => void ota.download()}>
          <CloudDownload className="h-4 w-4" />{t("releaseConsole.ota.downloadTest")}
        </Button>
      </div>
      {ota.message ? <div className="rounded-md bg-muted p-3 text-sm">{t(ota.message)}</div> : null}
      {ota.progress ? <div className="rounded-md border bg-surface p-3">
        <div className="flex justify-between text-sm"><span>{ota.progress.detail || ota.progress.statusKey}</span>
          <strong>{ota.progress.progress}%</strong></div>
        <div className="mt-2 h-2 overflow-hidden rounded-sm bg-muted"><div className="h-full bg-primary"
          style={{ width: `${ota.progress.progress}%` }} /></div>
      </div> : null}
      {ota.dashboard && !release ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {t("releaseConsole.ota.loadFailed")}
        </div>
      ) : release && current?.manifest && ota.dashboard ? (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Metric label={t("releaseConsole.ota.currentVersion")} value={release.version}
              detail={release.releaseId} />
            <Metric label={t("releaseConsole.ota.approval")}
              value={t(release.approved ? "releaseConsole.common.yes" : "releaseConsole.common.no")} />
            <Metric label={t("releaseConsole.ota.size")} value={release.size}
              detail={`${release.fileCount} ${t("releaseConsole.ota.files")}`} />
            <Metric label={t("releaseConsole.ota.mandatory")}
              value={t(release.mandatory ? "releaseConsole.common.yes" : "releaseConsole.common.no")} />
          </div>
          <section className="flex flex-wrap items-end gap-3 rounded-md border bg-surface p-4">
            <label className="grid gap-1 text-sm"><span>{t("releaseConsole.ota.rollout")}</span>
              <Input ui={{ uid: "release-console.ota.rollout-bIDnK9", id: "release-console.ota.rollout", kind: "field", part: "rollout" }} className="w-28" type="number" min={release.rolloutPercentage} max="100"
                value={ota.rollout} onChange={(event) => ota.setRollout(Number(event.target.value))} /></label>
            <Button ui={{ uid: "release-console.ota.change-approval-LmR7fT", id: "release-console.ota.change-approval", kind: "action", action: "change-approval", part: "rollout" }} variant={release.approved ? "destructive" : "default"} disabled={ota.busy}
              onClick={() => void ota.changeApproval(!release.approved)}>
              {release.approved ? <Ban className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
              {t(release.approved ? "releaseConsole.ota.revoke" : "releaseConsole.ota.approve")}
            </Button>
            <Button ui={{ uid: "release-console.ota.copy-manifest-LE3PFR", id: "release-console.ota.copy-manifest", kind: "action", action: "copy-manifest", part: "rollout" }} variant="outline" onClick={() => void ota.copyManifest()}>
              <ClipboardCopy className="h-4 w-4" />{t("releaseConsole.ota.copyManifest")}
            </Button>
          </section>
          <section className="rounded-md border bg-surface p-4">
            <h2 className="mb-3 font-semibold">{t("releaseConsole.ota.releaseFiles")}</h2>
            <div className="max-h-96 overflow-auto rounded-md border">
              <table className="w-full min-w-[42rem] text-sm" dir="ltr"><tbody>
                {Object.entries(current.manifest.files).map(([name, file]) => (
                  <tr key={name} className="border-t"><td className="p-2 font-mono text-xs">{name}</td>
                    <td className="p-2">{file.size}</td><td className="max-w-64 truncate p-2">{file.sha256}</td></tr>
                ))}
              </tbody></table>
            </div>
          </section>
          <OtaReleaseChanges diff={ota.diff} history={ota.dashboard.history} currentId={release.releaseId}
            baseId={ota.baseReleaseId} onBaseChange={ota.setBaseReleaseId}
            emptyText={t("releaseConsole.empty")} />
          <section className="rounded-md border bg-surface p-4">
            <h2 className="mb-3 font-semibold">{t("releaseConsole.ota.adoption")}</h2>
            <div className="overflow-auto rounded-md border">
              <table className="w-full min-w-[42rem] text-sm" dir="ltr"><tbody>
                {ota.dashboard.adoption.map((item) => (
                  <tr key={item.version} className="border-t">
                    <td className="p-2 font-semibold">{item.version}</td>
                    <td className="p-2"><pre>{JSON.stringify(item.outcomes, null, 2)}</pre></td>
                  </tr>
                ))}
                {!ota.dashboard.adoption.length ? <tr><td className="p-3" colSpan={2}>
                  {t("releaseConsole.empty")}</td></tr> : null}
              </tbody></table>
            </div>
          </section>
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-md border bg-surface p-4"><h2 className="mb-3 font-semibold">
              {t("releaseConsole.ota.history")}</h2><div className="space-y-2">
              {ota.dashboard.history.map((item) => <div key={item.releaseId}
                className="rounded-md border p-2 text-sm"><strong dir="ltr">{item.version}</strong>
                <span className="ms-2 text-on-surface-variant">{String(item.approved)}</span></div>)}
            </div></section>
            <section className="rounded-md border bg-surface p-4"><h2 className="mb-3 font-semibold">
              {t("releaseConsole.ota.audit")}</h2><div className="max-h-80 space-y-2 overflow-auto">
              {ota.dashboard.audit.map((item) => <div key={item.id} className="rounded-md border p-2 text-sm">
                <strong>{t(`releaseConsole.ota.auditAction.${item.action}`)}</strong>
                <div className="text-xs text-on-surface-variant" dir="ltr">{item.version} / {item.actorUid}</div>
              </div>)}
            </div></section>
          </div>
        </>
      ) : ota.message ? null : <div className="p-4 text-sm">{t("releaseConsole.loading")}</div>}
    </section>
  );
}
