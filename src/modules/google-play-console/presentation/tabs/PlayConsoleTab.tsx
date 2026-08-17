"use client";

import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAdminArabic } from "@/lib/i18n/use-admin-arabic";
import { usePlayConsoleSnapshot } from "../../hooks/use-play-console-snapshot";
import { EndpointCard } from "../components/EndpointCard";
import { InfoRow } from "../components/InfoRow";
import { Metric } from "../components/Metric";

export function PlayConsoleTab() {
  const { t } = useAdminArabic();
  const { snapshot, busy, error, refresh } = usePlayConsoleSnapshot();
  return (
    <section className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" disabled={busy} onClick={() => void refresh()}>
          <RefreshCw className={busy ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          {t("releaseConsole.actions.refresh")}
        </Button>
      </div>
      {error ? <div className="rounded-md bg-error-container p-3 text-on-error-container">{error}</div> : null}
      {snapshot ? (
        <>
          <div className="grid gap-3 md:grid-cols-4">
            <Metric label={t("releaseConsole.play.successfulEndpoints")}
              value={snapshot.summary.successfulEndpoints} />
            <Metric label={t("releaseConsole.play.failedEndpoints")} value={snapshot.summary.failedEndpoints} />
            <Metric label={t("releaseConsole.play.tracks")} value={snapshot.summary.tracks} />
            <Metric label={t("releaseConsole.play.releases")} value={snapshot.summary.releases} />
          </div>
          <section className="rounded-md border bg-surface p-4">
            <h2 className="mb-3 font-semibold">{t("releaseConsole.play.connection")}</h2>
            <dl className="grid gap-2">
              <InfoRow label={t("releaseConsole.overview.package")} value={snapshot.config.packageName} ltr />
              <InfoRow label={t("releaseConsole.play.serviceAccount")}
                value={snapshot.config.serviceAccountEmail || "-"} ltr />
              <InfoRow label={t("releaseConsole.play.projectId")}
                value={snapshot.config.serviceAccountProjectId || "-"} ltr />
              <InfoRow label={t("releaseConsole.overview.credentialSource")}
                value={snapshot.config.credentialSource} ltr />
            </dl>
          </section>
          <div className="grid gap-4 lg:grid-cols-2">
            {snapshot.endpoints.map((endpoint) => (
              <EndpointCard key={endpoint.key} endpoint={endpoint}
                availableText={t("releaseConsole.play.available")}
                unavailableText={t("releaseConsole.play.unavailable")} />
            ))}
          </div>
        </>
      ) : <div className="p-4 text-sm">{t("releaseConsole.loading")}</div>}
    </section>
  );
}
