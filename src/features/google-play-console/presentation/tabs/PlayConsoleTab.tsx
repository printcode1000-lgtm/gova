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
    <section id='google-play-console-presentation-tabs-playconsoletab-section-1-yd7no8' className="space-y-4">
      <div id='google-play-console-presentation-tabs-playconsoletab-div-2-g5ruce' className="flex justify-end">
        <Button
          id='google-play-console-presentation-tabs-playconsoletab-button-3-q4jtxb'
          variant="outline"
          disabled={busy}
          onClick={() => void refresh()}
        >
          <RefreshCw
            id='google-play-console-presentation-tabs-playconsoletab-refreshcw-4-yabhqj'
            className={busy ? "h-4 w-4 animate-spin" : "h-4 w-4"}
          />
          {t("releaseConsole.actions.refresh")}
        </Button>
      </div>
      {error ? (
        <div
          id='google-play-console-presentation-tabs-playconsoletab-div-5-kcfzu8'
          className="rounded-md bg-error-container p-3 text-on-error-container"
        >
          {error}
        </div>
      ) : null}
      {snapshot ? (
        <>
          <div id='google-play-console-presentation-tabs-playconsoletab-div-6-jxjorf' className="grid gap-3 md:grid-cols-4">
            <Metric
              id='google-play-console-presentation-tabs-playconsoletab-metric-7-7xnub7'
              label={t("releaseConsole.play.successfulEndpoints")}
              value={snapshot.summary.successfulEndpoints}
            />
            <Metric
              id='google-play-console-presentation-tabs-playconsoletab-metric-8-mknrkw'
              label={t("releaseConsole.play.failedEndpoints")}
              value={snapshot.summary.failedEndpoints}
            />
            <Metric
              id='google-play-console-presentation-tabs-playconsoletab-metric-9-zn34iu'
              label={t("releaseConsole.play.tracks")}
              value={snapshot.summary.tracks}
            />
            <Metric
              id='google-play-console-presentation-tabs-playconsoletab-metric-10-ryjwej'
              label={t("releaseConsole.play.releases")}
              value={snapshot.summary.releases}
            />
          </div>
          <section
            id='google-play-console-presentation-tabs-playconsoletab-section-11-a9ddd0'
            className="rounded-md border bg-surface p-4"
          >
            <h2 id='google-play-console-presentation-tabs-playconsoletab-heading-12-is9e1p' className="mb-3 font-semibold">
              {t("releaseConsole.play.connection")}
            </h2>
            <dl id="google-play-console-presentation-tabs-playconsoletab-dl-13-s0jwko" className="grid gap-2">
              <InfoRow
                id='google-play-console-presentation-tabs-playconsoletab-inforow-14-4ol12p'
                label={t("releaseConsole.overview.package")}
                value={snapshot.config.packageName}
                ltr
              />
              <InfoRow
                id='google-play-console-presentation-tabs-playconsoletab-inforow-15-e7bbjf'
                label={t("releaseConsole.play.serviceAccount")}
                value={snapshot.config.serviceAccountEmail || "-"}
                ltr
              />
              <InfoRow
                id='google-play-console-presentation-tabs-playconsoletab-inforow-16-8er0c3'
                label={t("releaseConsole.play.projectId")}
                value={snapshot.config.serviceAccountProjectId || "-"}
                ltr
              />
              <InfoRow
                id='google-play-console-presentation-tabs-playconsoletab-inforow-17-gvlwfw'
                label={t("releaseConsole.overview.credentialSource")}
                value={snapshot.config.credentialSource}
                ltr
              />
            </dl>
          </section>
          <div id='google-play-console-presentation-tabs-playconsoletab-div-18-ej7rx5' className="grid gap-4 lg:grid-cols-2">
            {snapshot.endpoints.map((endpoint) => (
              <EndpointCard
                key={endpoint.key}
                endpoint={endpoint}
                availableText={t("releaseConsole.play.available")}
                unavailableText={t("releaseConsole.play.unavailable")}
              />
            ))}
          </div>
        </>
      ) : (
        <div id='google-play-console-presentation-tabs-playconsoletab-div-19-4mlk0n' className="p-4 text-sm">
          {t("releaseConsole.loading")}
        </div>
      )}
    </section>
  );
}
