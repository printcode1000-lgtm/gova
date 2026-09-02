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
    <section id='google-play-console-presentation-tabs-bundleanalysistab-section-1-l5zx6a' className="space-y-4">
      <div
        id='google-play-console-presentation-tabs-bundleanalysistab-div-2-q4lf1o'
        className="flex flex-wrap gap-2 rounded-md border bg-surface p-3"
      >
        <select
          id='google-play-console-presentation-tabs-bundleanalysistab-select-3-uusuoq'
          className="h-10 min-w-72 flex-1 rounded-md border bg-background px-3"
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
          dir="ltr"
        >
          <option id="google-play-console-presentation-tabs-bundleanalysistab-option-4-6kbsbf" value="">{t("releaseConsole.analysis.selectArtifact")}</option>
          {artifacts.map((item) => (
            <option key={`${item.jobId}:${item.name}`} value={`${item.jobId}:${item.name}`}>
              {item.name}
            </option>
          ))}
        </select>
        <Button
          id='google-play-console-presentation-tabs-bundleanalysistab-button-5-voelda'
          disabled={!chosen || bundle.busy}
          onClick={() => chosen && void bundle.analyze(chosen.jobId, chosen.name)}
        >
          <Search id='google-play-console-presentation-tabs-bundleanalysistab-search-6-azbwmg' className="h-4 w-4" />
          {t("releaseConsole.analysis.analyze")}
        </Button>
      </div>
      {bundle.analysis ? (
        <>
          <div id='google-play-console-presentation-tabs-bundleanalysistab-div-7-lejnvr' className="grid gap-3 md:grid-cols-4">
            <Metric
              id='google-play-console-presentation-tabs-bundleanalysistab-metric-8-9gqztp'
              label={t("releaseConsole.analysis.archiveBytes")}
              value={bundle.analysis.archiveBytes}
            />
            <Metric
              id='google-play-console-presentation-tabs-bundleanalysistab-metric-9-e53tqd'
              label={t("releaseConsole.analysis.compressedBytes")}
              value={bundle.analysis.totalCompressedBytes}
            />
            <Metric
              id='google-play-console-presentation-tabs-bundleanalysistab-metric-10-tvnpq1'
              label={t("releaseConsole.analysis.entries")}
              value={bundle.analysis.entryCount}
            />
            <div
              id='google-play-console-presentation-tabs-bundleanalysistab-div-11-s3of2k'
              className="rounded-md border-2 border-error bg-error-container p-4 text-on-error-container"
            >
              <div id='google-play-console-presentation-tabs-bundleanalysistab-div-12-ltt5kc' className="text-xs font-semibold">
                {t("releaseConsole.analysis.unclassified")}
              </div>
              <div id='google-play-console-presentation-tabs-bundleanalysistab-div-13-bk9zzg' className="mt-2 text-xl font-bold">
                {unclassified?.compressedBytes ?? 0}
              </div>
            </div>
          </div>
          <CategoryTree nodes={bundle.analysis.categories} />
          {bundle.analysis.deliveryEstimates?.length ? (
            <section
              id='google-play-console-presentation-tabs-bundleanalysistab-section-14-fj0lni'
              className="rounded-md border bg-surface p-4"
            >
              <h2 id='google-play-console-presentation-tabs-bundleanalysistab-heading-15-promdz' className="mb-3 font-semibold">
                {t("releaseConsole.analysis.delivery")}
              </h2>
              <div id='google-play-console-presentation-tabs-bundleanalysistab-div-16-u8hw7v' className="grid gap-2 md:grid-cols-2">
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
              <p id='google-play-console-presentation-tabs-bundleanalysistab-text-17-agmqne' className="mt-2 text-xs text-on-surface-variant">
                {t("releaseConsole.analysis.deliveryEstimateNote")}
              </p>
            </section>
          ) : null}
        </>
      ) : null}
      <section
        id='google-play-console-presentation-tabs-bundleanalysistab-section-18-ixxkd0'
        className="space-y-3 rounded-md border bg-surface p-4"
      >
        <h2 id='google-play-console-presentation-tabs-bundleanalysistab-heading-19-uxvfpm' className="font-semibold">
          {t("releaseConsole.analysis.compare")}
        </h2>
        <div
          id='google-play-console-presentation-tabs-bundleanalysistab-div-20-1cytys'
          className="grid gap-2 md:grid-cols-[1fr_1fr_auto]"
        >
          <input
            id='google-play-console-presentation-tabs-bundleanalysistab-input-21-kp5eyw'
            className="h-10 rounded-md border bg-background px-3"
            value={left}
            onChange={(event) => setLeft(event.target.value)}
            placeholder={t("releaseConsole.analysis.leftSha")}
          />
          <input
            id='google-play-console-presentation-tabs-bundleanalysistab-input-22-14cpqa'
            className="h-10 rounded-md border bg-background px-3"
            value={right}
            onChange={(event) => setRight(event.target.value)}
            placeholder={t("releaseConsole.analysis.rightSha")}
          />
          <Button
            id='google-play-console-presentation-tabs-bundleanalysistab-button-23-q7w9v3'
            disabled={!left || !right || bundle.busy}
            onClick={() => void bundle.compare(left, right)}
          >
            {t("releaseConsole.analysis.compare")}
          </Button>
        </div>
        <DeltaTable
          id='google-play-console-presentation-tabs-bundleanalysistab-deltatable-24-hllmo8'
          rows={bundle.comparison?.categories ?? []}
          emptyText={t("releaseConsole.empty")}
        />
      </section>
    </section>
  );
}
