"use client";

import * as React from "react";
import { Search } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { useAdminArabic } from "@/shared/i18n/use-admin-arabic";
import { useBundleAnalysis } from "../hooks/use-bundle-analysis";
import { CategoryTree } from "../components/CategoryTree";
import { DeltaTable } from "../components/DeltaTable";
import { Metric } from "../components/Metric";

export function BundleAnalysisTab() {
  const { t } = useAdminArabic();
  const bundle = useBundleAnalysis();
  const artifacts = bundle.jobs.flatMap((job) =>
    (job.artifacts ?? [])
      .filter((artifact) => /\.(?:apk|aab)$/i.test(artifact.name))
      .map((artifact) => ({ ...artifact, jobId: job.id })),
  );
  const [selected, setSelected] = React.useState("");
  const [left, setLeft] = React.useState("");
  const [right, setRight] = React.useState("");
  const chosen = artifacts.find((item) => `${item.jobId}:${item.name}` === selected);
  const unclassified = bundle.analysis?.categories.find((item) => item.id === "unclassified");
  return (
    <section id="google-play-console.tabs.bundle-analysis-tab.section" className="space-y-4">
      <div
        id="google-play-console.tabs.bundle-analysis-tab.div"
        className="flex flex-wrap gap-2 rounded-md border bg-surface p-3"
      >
        <select
          id="google-play-console.tabs.bundle-analysis-tab.select"
          className="h-10 min-w-72 flex-1 rounded-md border bg-background px-3"
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
          dir="ltr"
        >
          <option value="">{t("releaseConsole.analysis.selectArtifact")}</option>
          {artifacts.map((item) => (
            <option key={`${item.jobId}:${item.name}`} value={`${item.jobId}:${item.name}`}>
              {item.name}
            </option>
          ))}
        </select>
        <Button
          id="google-play-console.tabs.bundle-analysis-tab.button"
          disabled={!chosen || bundle.busy}
          onClick={() => chosen && void bundle.analyze(chosen.jobId, chosen.name)}
        >
          <Search id="google-play-console.tabs.bundle-analysis-tab.search" className="h-4 w-4" />
          {t("releaseConsole.analysis.analyze")}
        </Button>
      </div>
      {bundle.analysis ? (
        <>
          <div id="google-play-console.tabs.bundle-analysis-tab.div.2" className="grid gap-3 md:grid-cols-4">
            <Metric
              id="google-play-console.tabs.bundle-analysis-tab.metric"
              label={t("releaseConsole.analysis.archiveBytes")}
              value={bundle.analysis.archiveBytes}
            />
            <Metric
              id="google-play-console.tabs.bundle-analysis-tab.metric.2"
              label={t("releaseConsole.analysis.compressedBytes")}
              value={bundle.analysis.totalCompressedBytes}
            />
            <Metric
              id="google-play-console.tabs.bundle-analysis-tab.metric.3"
              label={t("releaseConsole.analysis.entries")}
              value={bundle.analysis.entryCount}
            />
            <div
              id="google-play-console.tabs.bundle-analysis-tab.div.3"
              className="rounded-md border-2 border-error bg-error-container p-4 text-on-error-container"
            >
              <div id="google-play-console.tabs.bundle-analysis-tab.div.4" className="text-xs font-semibold">
                {t("releaseConsole.analysis.unclassified")}
              </div>
              <div id="google-play-console.tabs.bundle-analysis-tab.div.5" className="mt-2 text-xl font-bold">
                {unclassified?.compressedBytes ?? 0}
              </div>
            </div>
          </div>
          <CategoryTree nodes={bundle.analysis.categories} />
          {bundle.analysis.deliveryEstimates?.length ? (
            <section
              id="google-play-console.tabs.bundle-analysis-tab.section.2"
              className="rounded-md border bg-surface p-4"
            >
              <h2 id="google-play-console.tabs.bundle-analysis-tab.h2" className="mb-3 font-semibold">
                {t("releaseConsole.analysis.delivery")}
              </h2>
              <div id="google-play-console.tabs.bundle-analysis-tab.div.6" className="grid gap-2 md:grid-cols-2">
                {bundle.analysis.deliveryEstimates.map((estimate) => (
                  <div
                    key={`${estimate.abi}:${estimate.density}:${estimate.language}`}
                    className="rounded-md bg-muted p-3 text-sm"
                    dir="ltr"
                  >
                    {estimate.abi} / {estimate.density ?? "-"} / {estimate.language ?? "-"}:&nbsp;
                    {estimate.compressedBytes}
                  </div>
                ))}
              </div>
              <p id="google-play-console.tabs.bundle-analysis-tab.p" className="mt-2 text-xs text-on-surface-variant">
                {t("releaseConsole.analysis.deliveryEstimateNote")}
              </p>
            </section>
          ) : null}
        </>
      ) : null}
      <section
        id="google-play-console.tabs.bundle-analysis-tab.section.3"
        className="space-y-3 rounded-md border bg-surface p-4"
      >
        <h2 id="google-play-console.tabs.bundle-analysis-tab.h2.2" className="font-semibold">
          {t("releaseConsole.analysis.compare")}
        </h2>
        <div
          id="google-play-console.tabs.bundle-analysis-tab.div.7"
          className="grid gap-2 md:grid-cols-[1fr_1fr_auto]"
        >
          <input
            id="google-play-console.tabs.bundle-analysis-tab.input"
            className="h-10 rounded-md border bg-background px-3"
            value={left}
            onChange={(event) => setLeft(event.target.value)}
            placeholder={t("releaseConsole.analysis.leftSha")}
          />
          <input
            id="google-play-console.tabs.bundle-analysis-tab.input.2"
            className="h-10 rounded-md border bg-background px-3"
            value={right}
            onChange={(event) => setRight(event.target.value)}
            placeholder={t("releaseConsole.analysis.rightSha")}
          />
          <Button
            id="google-play-console.tabs.bundle-analysis-tab.button.2"
            disabled={!left || !right || bundle.busy}
            onClick={() => void bundle.compare(left, right)}
          >
            {t("releaseConsole.analysis.compare")}
          </Button>
        </div>
        <DeltaTable
          id="google-play-console.tabs.bundle-analysis-tab.delta-table"
          rows={bundle.comparison?.categories ?? []}
          emptyText={t("releaseConsole.empty")}
        />
      </section>
    </section>
  );
}
