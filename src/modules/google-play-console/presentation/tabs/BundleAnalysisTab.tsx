"use client";

import * as React from "react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";
import { useBundleAnalysis } from "../../hooks/use-bundle-analysis";
import { CategoryTree } from "../components/CategoryTree";
import { DeltaTable } from "../components/DeltaTable";
import { Metric } from "../components/Metric";

export function BundleAnalysisTab() {
  const { t } = useTranslation();
  const bundle = useBundleAnalysis();
  const artifacts = bundle.jobs.flatMap((job) => (job.artifacts ?? [])
    .filter((artifact) => /\.(?:apk|aab)$/i.test(artifact.name))
    .map((artifact) => ({ ...artifact, jobId: job.id })));
  const [selected, setSelected] = React.useState("");
  const [left, setLeft] = React.useState("");
  const [right, setRight] = React.useState("");
  const chosen = artifacts.find((item) => `${item.jobId}:${item.name}` === selected);
  const unclassified = bundle.analysis?.categories.find((item) => item.id === "unclassified");
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-2 rounded-md border bg-surface p-3">
        <select className="h-10 min-w-72 flex-1 rounded-md border bg-background px-3" value={selected}
          onChange={(event) => setSelected(event.target.value)} dir="ltr">
          <option value="">{t("releaseConsole.analysis.selectArtifact")}</option>
          {artifacts.map((item) => <option key={`${item.jobId}:${item.name}`}
            value={`${item.jobId}:${item.name}`}>{item.name}</option>)}
        </select>
        <Button disabled={!chosen || bundle.busy}
          onClick={() => chosen && void bundle.analyze(chosen.jobId, chosen.name)}>
          <Search className="h-4 w-4" />{t("releaseConsole.analysis.analyze")}
        </Button>
      </div>
      {bundle.analysis ? (
        <>
          <div className="grid gap-3 md:grid-cols-4">
            <Metric label={t("releaseConsole.analysis.archiveBytes")} value={bundle.analysis.archiveBytes} />
            <Metric label={t("releaseConsole.analysis.compressedBytes")}
              value={bundle.analysis.totalCompressedBytes} />
            <Metric label={t("releaseConsole.analysis.entries")} value={bundle.analysis.entryCount} />
            <div className="rounded-md border-2 border-error bg-error-container p-4 text-on-error-container">
              <div className="text-xs font-semibold">{t("releaseConsole.analysis.unclassified")}</div>
              <div className="mt-2 text-xl font-bold">{unclassified?.compressedBytes ?? 0}</div>
            </div>
          </div>
          <CategoryTree nodes={bundle.analysis.categories} />
          {bundle.analysis.deliveryEstimates?.length ? (
            <section className="rounded-md border bg-surface p-4">
              <h2 className="mb-3 font-semibold">{t("releaseConsole.analysis.delivery")}</h2>
              <div className="grid gap-2 md:grid-cols-2">
                {bundle.analysis.deliveryEstimates.map((estimate) => (
                  <div key={`${estimate.abi}:${estimate.density}:${estimate.language}`}
                    className="rounded-md bg-muted p-3 text-sm" dir="ltr">
                    {estimate.abi} / {estimate.density ?? "-"} / {estimate.language ?? "-"}:&nbsp;
                    {estimate.compressedBytes}
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-on-surface-variant">
                {t("releaseConsole.analysis.deliveryEstimateNote")}
              </p>
            </section>
          ) : null}
        </>
      ) : null}
      <section className="space-y-3 rounded-md border bg-surface p-4">
        <h2 className="font-semibold">{t("releaseConsole.analysis.compare")}</h2>
        <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
          <input className="h-10 rounded-md border bg-background px-3" value={left}
            onChange={(event) => setLeft(event.target.value)} placeholder={t("releaseConsole.analysis.leftSha")} />
          <input className="h-10 rounded-md border bg-background px-3" value={right}
            onChange={(event) => setRight(event.target.value)} placeholder={t("releaseConsole.analysis.rightSha")} />
          <Button disabled={!left || !right || bundle.busy} onClick={() => void bundle.compare(left, right)}>
            {t("releaseConsole.analysis.compare")}
          </Button>
        </div>
        <DeltaTable rows={bundle.comparison?.categories ?? []} emptyText={t("releaseConsole.empty")} />
      </section>
    </section>
  );
}
