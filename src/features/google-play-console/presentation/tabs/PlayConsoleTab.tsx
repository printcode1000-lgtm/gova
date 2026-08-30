"use client";

import { RefreshCw } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { useAdminArabic } from "@/shared/i18n/use-admin-arabic";
import { usePlayConsoleSnapshot } from "../hooks/use-play-console-snapshot";
import { EndpointCard } from "../components/EndpointCard";
import { InfoRow } from "../components/InfoRow";
import { Metric } from "../components/Metric";

export function PlayConsoleTab() {
  const { t } = useAdminArabic();
  const { snapshot, busy, error, refresh } = usePlayConsoleSnapshot();
  return (
    <section id="google-play-console.tabs.play-console-tab.section" className="space-y-4">
      <div id="google-play-console.tabs.play-console-tab.div" className="flex justify-end">
        <Button
          id="google-play-console.tabs.play-console-tab.button"
          variant="outline"
          disabled={busy}
          onClick={() => void refresh()}
        >
          <RefreshCw
            id="google-play-console.tabs.play-console-tab.refresh-cw"
            className={busy ? "h-4 w-4 animate-spin" : "h-4 w-4"}
          />
          {t("releaseConsole.actions.refresh")}
        </Button>
      </div>
      {error ? <div id="google-play-console.tabs.play-console-tab.div.2" className="rounded-md bg-error-container p-3 text-on-error-container">{error}</div> : null}
      {snapshot ? (
        <>
          <div id="google-play-console.tabs.play-console-tab.div.3" className="grid gap-3 md:grid-cols-4">
            <Metric id="google-play-console.tabs.play-console-tab.metric" label={t("releaseConsole.play.successfulEndpoints")}
              value={snapshot.summary.successfulEndpoints} />
            <Metric
              id="google-play-console.tabs.play-console-tab.metric.2"
              label={t("releaseConsole.play.failedEndpoints")}
              value={snapshot.summary.failedEndpoints}
            />
            <Metric
              id="google-play-console.tabs.play-console-tab.metric.3"
              label={t("releaseConsole.play.tracks")}
              value={snapshot.summary.tracks}
            />
            <Metric
              id="google-play-console.tabs.play-console-tab.metric.4"
              label={t("releaseConsole.play.releases")}
              value={snapshot.summary.releases}
            />
          </div>
          <section
            id="google-play-console.tabs.play-console-tab.section.2"
            className="rounded-md border bg-surface p-4"
          >
            <h2
              id="google-play-console.tabs.play-console-tab.h2"
              className="mb-3 font-semibold">{t("releaseConsole.play.connection")}</h2
            >
            <dl className="grid gap-2">
              <InfoRow
                id="google-play-console.tabs.play-console-tab.info-row"
                label={t("releaseConsole.overview.package")}
                value={snapshot.config.packageName}
                ltr
              />
              <InfoRow id="google-play-console.tabs.play-console-tab.info-row.2" label={t("releaseConsole.play.serviceAccount")}
                value={snapshot.config.serviceAccountEmail || "-"} ltr />
              <InfoRow id="google-play-console.tabs.play-console-tab.info-row.3" label={t("releaseConsole.play.projectId")}
                value={snapshot.config.serviceAccountProjectId || "-"} ltr />
              <InfoRow id="google-play-console.tabs.play-console-tab.info-row.4" label={t("releaseConsole.overview.credentialSource")}
                value={snapshot.config.credentialSource} ltr />
            </dl>
          </section>
          <div id="google-play-console.tabs.play-console-tab.div.4" className="grid gap-4 lg:grid-cols-2">
            {snapshot.endpoints.map((endpoint) => (
              <EndpointCard key={endpoint.key} endpoint={endpoint}
                availableText={t("releaseConsole.play.available")}
                unavailableText={t("releaseConsole.play.unavailable")} />
            ))}
          </div>
        </>
      ) : <div id="google-play-console.tabs.play-console-tab.div.5" className="p-4 text-sm">{t("releaseConsole.loading")}</div>}
    </section>
  );
}
