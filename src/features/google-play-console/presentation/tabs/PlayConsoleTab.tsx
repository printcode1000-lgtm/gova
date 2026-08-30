"use client";

import { RefreshCw } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { useAdminArabic } from "@/shared/i18n/use-admin-arabic";
import { usePlayConsoleSnapshot } from "../hooks/use-play-console-snapshot";
import { EndpointCard } from "../components/EndpointCard";
import { InfoRow } from "../components/InfoRow";
import { Metric } from "../components/Metric";
import { createUiInstanceId, uiAttributes } from "@asol/ui-registry-core";

export function PlayConsoleTab() {
  const { t } = useAdminArabic();
  const { snapshot, busy, error, refresh } = usePlayConsoleSnapshot();
  return (
    <section {...uiAttributes({ uid: "google-play-console.tabs.play-console-tab.section.3-roA1I5", id: "google-play-console.tabs.play-console-tab.section.3" })} id="google-play-console.tabs.play-console-tab.section" className="space-y-4">
      <div {...uiAttributes({ uid: "google-play-console.tabs.play-console-tab.div.6-Meu7nP", id: "google-play-console.tabs.play-console-tab.div.6" })} id="google-play-console.tabs.play-console-tab.div" className="flex justify-end">
        <Button id="google-play-console.tabs.play-console-tab.button"
          ui={{
            uid: "release-console.play-console.refresh-O5PMgw",
            id: "release-console.play-console.refresh",
            kind: "action",
            action: "refresh-play-console",
            part: "toolbar",
          }} variant="outline" disabled={busy} onClick={() => void refresh()}>
          <RefreshCw id="google-play-console.tabs.play-console-tab.refresh-cw" className={busy ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          {t("releaseConsole.actions.refresh")}
        </Button>
      </div>
      {error ? <div {...uiAttributes({ uid: "google-play-console.tabs.play-console-tab.div.7-uAPc9u", id: "google-play-console.tabs.play-console-tab.div.7" })} id="google-play-console.tabs.play-console-tab.div.2" className="rounded-md bg-error-container p-3 text-on-error-container">{error}</div> : null}
      {snapshot ? (
        <>
          <div {...uiAttributes({ uid: "google-play-console.tabs.play-console-tab.div.8-8ZQYXW", id: "google-play-console.tabs.play-console-tab.div.8" })} id="google-play-console.tabs.play-console-tab.div.3" className="grid gap-3 md:grid-cols-4">
            <Metric id="google-play-console.tabs.play-console-tab.metric" instance={createUiInstanceId("successful-endpoints")} label={t("releaseConsole.play.successfulEndpoints")}
              value={snapshot.summary.successfulEndpoints} />
            <Metric id="google-play-console.tabs.play-console-tab.metric.2" instance={createUiInstanceId("failed-endpoints")} label={t("releaseConsole.play.failedEndpoints")} value={snapshot.summary.failedEndpoints} />
            <Metric id="google-play-console.tabs.play-console-tab.metric.3" instance={createUiInstanceId("tracks")} label={t("releaseConsole.play.tracks")} value={snapshot.summary.tracks} />
            <Metric id="google-play-console.tabs.play-console-tab.metric.4" instance={createUiInstanceId("releases")} label={t("releaseConsole.play.releases")} value={snapshot.summary.releases} />
          </div>
          <section {...uiAttributes({ uid: "google-play-console.tabs.play-console-tab.section.4-D6K6In", id: "google-play-console.tabs.play-console-tab.section.4" })} id="google-play-console.tabs.play-console-tab.section.2" className="rounded-md border bg-surface p-4">
            <h2 {...uiAttributes({ uid: "google-play-console.tabs.play-console-tab.h2.2-5WLv19", id: "google-play-console.tabs.play-console-tab.h2.2" })} id="google-play-console.tabs.play-console-tab.h2" className="mb-3 font-semibold">{t("releaseConsole.play.connection")}</h2>
            <dl {...uiAttributes({ uid: "google-play-console.tabs.play-console-tab.dl-I1yYYa", id: "google-play-console.tabs.play-console-tab.dl" })} className="grid gap-2">
              <InfoRow id="google-play-console.tabs.play-console-tab.info-row" instance={createUiInstanceId("package")} label={t("releaseConsole.overview.package")} value={snapshot.config.packageName} ltr />
              <InfoRow id="google-play-console.tabs.play-console-tab.info-row.2" instance={createUiInstanceId("service-account")} label={t("releaseConsole.play.serviceAccount")}
                value={snapshot.config.serviceAccountEmail || "-"} ltr />
              <InfoRow id="google-play-console.tabs.play-console-tab.info-row.3" instance={createUiInstanceId("project-id")} label={t("releaseConsole.play.projectId")}
                value={snapshot.config.serviceAccountProjectId || "-"} ltr />
              <InfoRow id="google-play-console.tabs.play-console-tab.info-row.4" instance={createUiInstanceId("credential-source")} label={t("releaseConsole.overview.credentialSource")}
                value={snapshot.config.credentialSource} ltr />
            </dl>
          </section>
          <div {...uiAttributes({ uid: "google-play-console.tabs.play-console-tab.div.9-yY67As", id: "google-play-console.tabs.play-console-tab.div.9" })} id="google-play-console.tabs.play-console-tab.div.4" className="grid gap-4 lg:grid-cols-2">
            {snapshot.endpoints.map((endpoint) => (
              <EndpointCard key={endpoint.key} endpoint={endpoint}
                availableText={t("releaseConsole.play.available")}
                unavailableText={t("releaseConsole.play.unavailable")} />
            ))}
          </div>
        </>
      ) : <div {...uiAttributes({ uid: "google-play-console.tabs.play-console-tab.div.10-kjW4Sd", id: "google-play-console.tabs.play-console-tab.div.10" })} id="google-play-console.tabs.play-console-tab.div.5" className="p-4 text-sm">{t("releaseConsole.loading")}</div>}
    </section>
  );
}
