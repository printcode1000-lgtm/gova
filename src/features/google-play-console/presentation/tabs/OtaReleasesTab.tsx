"use client";

import { Ban, CheckCircle2, ClipboardCopy, CloudDownload, RefreshCw } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { useAdminArabic } from "@/shared/i18n/use-admin-arabic";
import { useOtaAdmin } from "../hooks/use-ota-admin";
import { useOtaRolloutPageSave } from "../hooks/use-ota-rollout-page-save";
import { Metric } from "../components/Metric";
import { OtaReleaseChanges } from "../components/OtaReleaseChanges";
import { createOpaqueUiInstanceId, createUiInstanceId, uiAttributes } from "@asol/ui-registry-core";

export function OtaReleasesTab() {
  const { t } = useAdminArabic();
  const ota = useOtaAdmin();
  const current = ota.dashboard?.current;
  const release = current?.release;
  useOtaRolloutPageSave(ota, true, release?.rolloutPercentage);
  return (
    <section {...uiAttributes({ uid: "google-play-console.tabs.ota-releases-tab.section.7-jJSZ0g", id: "google-play-console.tabs.ota-releases-tab.section.7" })} id="google-play-console.tabs.ota-releases-tab.section" className="space-y-4">
      <div {...uiAttributes({ uid: "google-play-console.tabs.ota-releases-tab.div.15-x0KV3h", id: "google-play-console.tabs.ota-releases-tab.div.15" })} id="google-play-console.tabs.ota-releases-tab.div" className="flex flex-wrap justify-end gap-2">
        <Button id="google-play-console.tabs.ota-releases-tab.button"
          ui={{
            uid: "release-console.ota.refresh-WPqR9E",
            id: "release-console.ota.refresh",
            kind: "action",
            action: "refresh-ota",
            part: "toolbar",
          }} variant="outline" disabled={ota.busy} onClick={() => void ota.refresh()}>
          <RefreshCw id="google-play-console.tabs.ota-releases-tab.refresh-cw" className="h-4 w-4" />{t("releaseConsole.actions.refresh")}
        </Button>
        <Button id="google-play-console.tabs.ota-releases-tab.button.2"
          ui={{
            uid: "release-console.ota.download-test-633aRH",
            id: "release-console.ota.download-test",
            kind: "action",
            action: "download-test-bundle",
            part: "toolbar",
          }} variant="secondary" disabled={ota.busy} onClick={() => void ota.download()}>
          <CloudDownload id="google-play-console.tabs.ota-releases-tab.cloud-download" className="h-4 w-4" />{t("releaseConsole.ota.downloadTest")}
        </Button>
      </div>
      {ota.message ? <div {...uiAttributes({ uid: "google-play-console.tabs.ota-releases-tab.div.16-hB1f4D", id: "google-play-console.tabs.ota-releases-tab.div.16" })} id="google-play-console.tabs.ota-releases-tab.div.2" className="rounded-md bg-muted p-3 text-sm">{t(ota.message)}</div> : null}
      {ota.progress ? <div {...uiAttributes({ uid: "google-play-console.tabs.ota-releases-tab.div.17-6qyNM4", id: "google-play-console.tabs.ota-releases-tab.div.17" })} id="google-play-console.tabs.ota-releases-tab.div.3" className="rounded-md border bg-surface p-3">
        <div {...uiAttributes({ uid: "google-play-console.tabs.ota-releases-tab.div.18-6duBiC", id: "google-play-console.tabs.ota-releases-tab.div.18" })} id="google-play-console.tabs.ota-releases-tab.div.4" className="flex justify-between text-sm"><span {...uiAttributes({ uid: "google-play-console.tabs.ota-releases-tab.span.3-0RBEJT", id: "google-play-console.tabs.ota-releases-tab.span.3" })} id="google-play-console.tabs.ota-releases-tab.span">{ota.progress.detail || ota.progress.statusKey}</span>
          <strong {...uiAttributes({ uid: "google-play-console.tabs.ota-releases-tab.strong-UnW665", id: "google-play-console.tabs.ota-releases-tab.strong" })}>{ota.progress.progress}%</strong></div>
        <div {...uiAttributes({ uid: "google-play-console.tabs.ota-releases-tab.div.19-6DxP61", id: "google-play-console.tabs.ota-releases-tab.div.19" })} id="google-play-console.tabs.ota-releases-tab.div.5" className="mt-2 h-2 overflow-hidden rounded-sm bg-muted"><div {...uiAttributes({ uid: "google-play-console.tabs.ota-releases-tab.div.20-Jmrg5X", id: "google-play-console.tabs.ota-releases-tab.div.20" })} id="google-play-console.tabs.ota-releases-tab.div.6" className="h-full bg-primary"
          style={{ width: `${ota.progress.progress}%` }} /></div>
      </div> : null}
      {ota.dashboard && !release ? (
        <div {...uiAttributes({ uid: "google-play-console.tabs.ota-releases-tab.div.21-j3vLoP", id: "google-play-console.tabs.ota-releases-tab.div.21" })} id="google-play-console.tabs.ota-releases-tab.div.7" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {t("releaseConsole.ota.loadFailed")}
        </div>
      ) : release && current?.manifest && ota.dashboard ? (
        <>
          <div {...uiAttributes({ uid: "google-play-console.tabs.ota-releases-tab.div.22-Ys8xLC", id: "google-play-console.tabs.ota-releases-tab.div.22" })} id="google-play-console.tabs.ota-releases-tab.div.8" className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Metric id="google-play-console.tabs.ota-releases-tab.metric" instance={createUiInstanceId("current-version")} label={t("releaseConsole.ota.currentVersion")} value={release.version}
              detail={release.releaseId} />
            <Metric id="google-play-console.tabs.ota-releases-tab.metric.2" instance={createUiInstanceId("approval")} label={t("releaseConsole.ota.approval")}
              value={t(release.approved ? "releaseConsole.common.yes" : "releaseConsole.common.no")} />
            <Metric id="google-play-console.tabs.ota-releases-tab.metric.3" instance={createUiInstanceId("size")} label={t("releaseConsole.ota.size")} value={release.size}
              detail={`${release.fileCount} ${t("releaseConsole.ota.files")}`} />
            <Metric id="google-play-console.tabs.ota-releases-tab.metric.4" instance={createUiInstanceId("mandatory")} label={t("releaseConsole.ota.mandatory")}
              value={t(release.mandatory ? "releaseConsole.common.yes" : "releaseConsole.common.no")} />
          </div>
          <section {...uiAttributes({ uid: "google-play-console.tabs.ota-releases-tab.section.8-JC5sCg", id: "google-play-console.tabs.ota-releases-tab.section.8" })} id="google-play-console.tabs.ota-releases-tab.section.2" className="flex flex-wrap items-end gap-3 rounded-md border bg-surface p-4">
            <label {...uiAttributes({ uid: "google-play-console.tabs.ota-releases-tab.label.2-XnDWJ2", id: "google-play-console.tabs.ota-releases-tab.label.2" })} id="google-play-console.tabs.ota-releases-tab.label" className="grid gap-1 text-sm"><span {...uiAttributes({ uid: "google-play-console.tabs.ota-releases-tab.span.4-WM6RT1", id: "google-play-console.tabs.ota-releases-tab.span.4" })} id="google-play-console.tabs.ota-releases-tab.span.2">{t("releaseConsole.ota.rollout")}</span>
              <Input id="google-play-console.tabs.ota-releases-tab.input"
                ui={{
                  uid: "release-console.ota.rollout-bIDnK9",
                  id: "release-console.ota.rollout",
                  kind: "field",
                  part: "rollout",
                }} className="w-28" type="number" min={release.rolloutPercentage} max="100"
                value={ota.rollout} onChange={(event) => ota.setRollout(Number(event.target.value))} /></label>
            <Button id="google-play-console.tabs.ota-releases-tab.button.3"
              ui={{
                uid: "release-console.ota.change-approval-LmR7fT",
                id: "release-console.ota.change-approval",
                kind: "action",
                action: "change-approval",
                part: "rollout",
              }} variant={release.approved ? "destructive" : "default"} disabled={ota.busy}
              onClick={() => void ota.changeApproval(!release.approved)}>
              {release.approved ? <Ban id="google-play-console.tabs.ota-releases-tab.ban" className="h-4 w-4" /> : <CheckCircle2 id="google-play-console.tabs.ota-releases-tab.check-circle2" className="h-4 w-4" />}
              {t(release.approved ? "releaseConsole.ota.revoke" : "releaseConsole.ota.approve")}
            </Button>
            <Button id="google-play-console.tabs.ota-releases-tab.button.4"
              ui={{
                uid: "release-console.ota.copy-manifest-LE3PFR",
                id: "release-console.ota.copy-manifest",
                kind: "action",
                action: "copy-manifest",
                part: "rollout",
              }} variant="outline" onClick={() => void ota.copyManifest()}>
              <ClipboardCopy id="google-play-console.tabs.ota-releases-tab.clipboard-copy" className="h-4 w-4" />{t("releaseConsole.ota.copyManifest")}
            </Button>
          </section>
          <section {...uiAttributes({ uid: "google-play-console.tabs.ota-releases-tab.section.9-i5TnTN", id: "google-play-console.tabs.ota-releases-tab.section.9" })} id="google-play-console.tabs.ota-releases-tab.section.3" className="rounded-md border bg-surface p-4">
            <h2 {...uiAttributes({ uid: "google-play-console.tabs.ota-releases-tab.h2.5-ovW3Tn", id: "google-play-console.tabs.ota-releases-tab.h2.5" })} id="google-play-console.tabs.ota-releases-tab.h2" className="mb-3 font-semibold">{t("releaseConsole.ota.releaseFiles")}</h2>
            <div {...uiAttributes({ uid: "google-play-console.tabs.ota-releases-tab.div.23-9HYw6O", id: "google-play-console.tabs.ota-releases-tab.div.23" })} id="google-play-console.tabs.ota-releases-tab.div.9" className="max-h-96 overflow-auto rounded-md border">
              <table {...uiAttributes({ uid: "google-play-console.tabs.ota-releases-tab.table.3-9l3Rq0", id: "google-play-console.tabs.ota-releases-tab.table.3" })} id="google-play-console.tabs.ota-releases-tab.table" className="w-full min-w-[42rem] text-sm" dir="ltr"><tbody {...uiAttributes({ uid: "google-play-console.tabs.ota-releases-tab.tbody.3-TY0zQe", id: "google-play-console.tabs.ota-releases-tab.tbody.3" })} id="google-play-console.tabs.ota-releases-tab.tbody">
                {Object.entries(current.manifest.files).map(([name, file]) => (
                  <tr key={name} {...uiAttributes({ uid: "google-play-console.tabs.ota-releases-tab.tr.2-zEGh6S", id: "google-play-console.tabs.ota-releases-tab.tr.2" , instance: createOpaqueUiInstanceId("iter-2e7442518a", String(name))})} className="border-t"><td {...uiAttributes({ uid: "google-play-console.tabs.ota-releases-tab.td.2-PZZB9T", id: "google-play-console.tabs.ota-releases-tab.td.2" , instance: createOpaqueUiInstanceId("iter-2e7442518a", String(name))})} className="p-2 font-mono text-xs">{name}</td>
                    <td {...uiAttributes({ uid: "google-play-console.tabs.ota-releases-tab.td.3-f0E8ye", id: "google-play-console.tabs.ota-releases-tab.td.3" , instance: createOpaqueUiInstanceId("iter-c347a1ff54", String(name))})} className="p-2">{file.size}</td><td {...uiAttributes({ uid: "google-play-console.tabs.ota-releases-tab.td.4-lMLIs3", id: "google-play-console.tabs.ota-releases-tab.td.4" , instance: createOpaqueUiInstanceId("iter-c347a1ff54", String(name))})} className="max-w-64 truncate p-2">{file.sha256}</td></tr>
                ))}
              </tbody></table>
            </div>
          </section>
          <OtaReleaseChanges diff={ota.diff} history={ota.dashboard.history} currentId={release.releaseId}
            baseId={ota.baseReleaseId} onBaseChange={ota.setBaseReleaseId}
            emptyText={t("releaseConsole.empty")} />
          <section {...uiAttributes({ uid: "google-play-console.tabs.ota-releases-tab.section.10-XZN5z5", id: "google-play-console.tabs.ota-releases-tab.section.10" })} id="google-play-console.tabs.ota-releases-tab.section.4" className="rounded-md border bg-surface p-4">
            <h2 {...uiAttributes({ uid: "google-play-console.tabs.ota-releases-tab.h2.6-xk9U1l", id: "google-play-console.tabs.ota-releases-tab.h2.6" })} id="google-play-console.tabs.ota-releases-tab.h2.2" className="mb-3 font-semibold">{t("releaseConsole.ota.adoption")}</h2>
            <div {...uiAttributes({ uid: "google-play-console.tabs.ota-releases-tab.div.24-WeB2Um", id: "google-play-console.tabs.ota-releases-tab.div.24" })} id="google-play-console.tabs.ota-releases-tab.div.10" className="overflow-auto rounded-md border">
              <table {...uiAttributes({ uid: "google-play-console.tabs.ota-releases-tab.table.4-S0478v", id: "google-play-console.tabs.ota-releases-tab.table.4" })} id="google-play-console.tabs.ota-releases-tab.table.2" className="w-full min-w-[42rem] text-sm" dir="ltr"><tbody {...uiAttributes({ uid: "google-play-console.tabs.ota-releases-tab.tbody.4-AW88xp", id: "google-play-console.tabs.ota-releases-tab.tbody.4" })} id="google-play-console.tabs.ota-releases-tab.tbody.2">
                {ota.dashboard.adoption.map((item) => (
                  <tr key={item.version} {...uiAttributes({ uid: "google-play-console.tabs.ota-releases-tab.tr.3-6f7sHs", id: "google-play-console.tabs.ota-releases-tab.tr.3" , instance: createOpaqueUiInstanceId("iter-ceb96c34dd", String(item.version))})} className="border-t">
                    <td {...uiAttributes({ uid: "google-play-console.tabs.ota-releases-tab.td.5-mE6iGK", id: "google-play-console.tabs.ota-releases-tab.td.5" , instance: createOpaqueUiInstanceId("iter-4c71c157b3", String(item.version))})} className="p-2 font-semibold">{item.version}</td>
                    <td {...uiAttributes({ uid: "google-play-console.tabs.ota-releases-tab.td.6-bSyU9r", id: "google-play-console.tabs.ota-releases-tab.td.6" , instance: createOpaqueUiInstanceId("iter-e3bd23f6ef", String(item.version))})} className="p-2"><pre {...uiAttributes({ uid: "google-play-console.tabs.ota-releases-tab.pre-E7UO1N", id: "google-play-console.tabs.ota-releases-tab.pre" , instance: createOpaqueUiInstanceId("iter-e3bd23f6ef", String(item.version))})}>{JSON.stringify(item.outcomes, null, 2)}</pre></td>
                  </tr>
                ))}
                {!ota.dashboard.adoption.length ? <tr {...uiAttributes({ uid: "google-play-console.tabs.ota-releases-tab.tr.4-fLK4f3", id: "google-play-console.tabs.ota-releases-tab.tr.4" })} id="google-play-console.tabs.ota-releases-tab.tr"><td {...uiAttributes({ uid: "google-play-console.tabs.ota-releases-tab.td.7-6myDfF", id: "google-play-console.tabs.ota-releases-tab.td.7" })} id="google-play-console.tabs.ota-releases-tab.td" className="p-3" colSpan={2}>
                  {t("releaseConsole.empty")}</td></tr> : null}
              </tbody></table>
            </div>
          </section>
          <div {...uiAttributes({ uid: "google-play-console.tabs.ota-releases-tab.div.25-MPkD60", id: "google-play-console.tabs.ota-releases-tab.div.25" })} id="google-play-console.tabs.ota-releases-tab.div.11" className="grid gap-4 lg:grid-cols-2">
            <section {...uiAttributes({ uid: "google-play-console.tabs.ota-releases-tab.section.11-5eJC6F", id: "google-play-console.tabs.ota-releases-tab.section.11" })} id="google-play-console.tabs.ota-releases-tab.section.5" className="rounded-md border bg-surface p-4"><h2 {...uiAttributes({ uid: "google-play-console.tabs.ota-releases-tab.h2.7-U5cWTi", id: "google-play-console.tabs.ota-releases-tab.h2.7" })} id="google-play-console.tabs.ota-releases-tab.h2.3" className="mb-3 font-semibold">
              {t("releaseConsole.ota.history")}</h2><div {...uiAttributes({ uid: "google-play-console.tabs.ota-releases-tab.div.26-KC5sxa", id: "google-play-console.tabs.ota-releases-tab.div.26" })} id="google-play-console.tabs.ota-releases-tab.div.12" className="space-y-2">
              {ota.dashboard.history.map((item) => <div key={item.releaseId} {...uiAttributes({ uid: "google-play-console.tabs.ota-releases-tab.div.27-CuZ0oZ", id: "google-play-console.tabs.ota-releases-tab.div.27" , instance: createOpaqueUiInstanceId("iter-3fb3bb5246", String(item.releaseId))})}
                className="rounded-md border p-2 text-sm"><strong {...uiAttributes({ uid: "google-play-console.tabs.ota-releases-tab.strong.2-DOKw4K", id: "google-play-console.tabs.ota-releases-tab.strong.2" , instance: createOpaqueUiInstanceId("iter-6c4d7ab4ef", String(item.releaseId))})} dir="ltr">{item.version}</strong>
                <span {...uiAttributes({ uid: "google-play-console.tabs.ota-releases-tab.span.5-k0YU8J", id: "google-play-console.tabs.ota-releases-tab.span.5" , instance: createOpaqueUiInstanceId("iter-c908cb4527", String(item.releaseId))})} className="ms-2 text-on-surface-variant">{String(item.approved)}</span></div>)}
            </div></section>
            <section {...uiAttributes({ uid: "google-play-console.tabs.ota-releases-tab.section.12-C6vAy5", id: "google-play-console.tabs.ota-releases-tab.section.12" })} id="google-play-console.tabs.ota-releases-tab.section.6" className="rounded-md border bg-surface p-4"><h2 {...uiAttributes({ uid: "google-play-console.tabs.ota-releases-tab.h2.8-TbnA2j", id: "google-play-console.tabs.ota-releases-tab.h2.8" })} id="google-play-console.tabs.ota-releases-tab.h2.4" className="mb-3 font-semibold">
              {t("releaseConsole.ota.audit")}</h2><div {...uiAttributes({ uid: "google-play-console.tabs.ota-releases-tab.div.28-G59aTo", id: "google-play-console.tabs.ota-releases-tab.div.28" })} id="google-play-console.tabs.ota-releases-tab.div.13" className="max-h-80 space-y-2 overflow-auto">
              {ota.dashboard.audit.map((item) => <div key={item.id} {...uiAttributes({ uid: "google-play-console.tabs.ota-releases-tab.div.29-5Sd7ZL", id: "google-play-console.tabs.ota-releases-tab.div.29" , instance: createOpaqueUiInstanceId("iter-338485889e", String(item.id))})} className="rounded-md border p-2 text-sm">
                <strong {...uiAttributes({ uid: "google-play-console.tabs.ota-releases-tab.strong.3-KHQg6y", id: "google-play-console.tabs.ota-releases-tab.strong.3" , instance: createOpaqueUiInstanceId("iter-809a519371", String(item.id))})}>{t(`releaseConsole.ota.auditAction.${item.action}`)}</strong>
                <div {...uiAttributes({ uid: "google-play-console.tabs.ota-releases-tab.div.30-KMj2G9", id: "google-play-console.tabs.ota-releases-tab.div.30" , instance: createOpaqueUiInstanceId("iter-e14db309ae", String(item.id))})} className="text-xs text-on-surface-variant" dir="ltr">{item.version} / {item.actorUid}</div>
              </div>)}
            </div></section>
          </div>
        </>
      ) : ota.message ? null : <div {...uiAttributes({ uid: "google-play-console.tabs.ota-releases-tab.div.31-DEzIJ4", id: "google-play-console.tabs.ota-releases-tab.div.31" })} id="google-play-console.tabs.ota-releases-tab.div.14" className="p-4 text-sm">{t("releaseConsole.loading")}</div>}
    </section>
  );
}
