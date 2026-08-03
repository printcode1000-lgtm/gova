"use client";

import * as React from "react";
import { ChevronDown, ExternalLink, FolderOpen, LoaderCircle, LockKeyhole, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n";
import type { BuildParameterName } from "@/modules/release-commands/domain/build-command-catalog";
import { AndroidReleasePaths } from "../components/AndroidReleasePaths";
import { CapBuildGuide, Doc, Parameter } from "../components/CommandParameterFields";
import { ReleaseCommandConfirmDialog } from "../components/ReleaseCommandConfirmDialog";
import { ReleaseJobStopDialog } from "../components/ReleaseJobStopDialog";
import { useReleaseJobs } from "../../hooks/use-release-jobs";

const CATEGORIES = ["web-static", "ota", "native-android", "verification", "fastlane"] as const;

export function BuildPublishTab() {
  const { t } = useTranslation();
  const jobs = useReleaseJobs();
  const [values, setValues] = React.useState<Record<string, Record<string, unknown>>>({});
  const [confirmations, setConfirmations] = React.useState<Record<string, string>>({});
  // One page-wide lock: while any job is queued or running every execute button
  // is disabled, so two commands can never overlap.
  const locked = jobs.locked;
  const change = (id: string, name: BuildParameterName, value: unknown) => {
    setValues((current) => ({ ...current, [id]: { ...current[id], [name]: value } }));
  };
  return (
    <section className="space-y-5">
      <ReleaseCommandConfirmDialog pending={jobs.pending} catalog={jobs.catalog} locked={locked} t={t}
        onConfirm={(overrides) => void jobs.confirmStart(overrides)} onCancel={jobs.dismissStart} />
      <ReleaseJobStopDialog job={jobs.pendingCancel} t={t}
        onConfirm={() => void jobs.confirmCancel()} onCancel={jobs.dismissCancel} />
      <AndroidReleasePaths busy={locked} jobs={jobs.jobs} start={jobs.start} cancel={jobs.cancel} t={t} />
      {CATEGORIES.map((category) => (
        <section key={category} className="space-y-3">
          <h2 className="font-semibold">{t(`releaseConsole.categories.${category}`)}</h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {jobs.catalog.filter((item) => item.category === category && !item.hidden).map((command) => {
              const ready = jobs.readiness.find((item) => item.commandId === command.id);
              const isCapSync = command.id === "cap-sync";
              const latestJob = jobs.jobs.find((job) =>
                job.commandId === command.id || (isCapSync && job.commandId === "cap-prepare-android"),
              );
              const confirmation = confirmations[command.id] ?? "";
              return (
                <details key={command.id} className="group rounded-md border bg-surface p-4">
                  <summary className="flex cursor-pointer list-none justify-between gap-3">
                    <span><strong>{t(command.documentation.titleKey)}</strong>
                      <code className="mt-1 block text-xs" dir="ltr">npm run {command.script}</code></span>
                    <ChevronDown className="h-4 w-4 group-open:rotate-180" />
                  </summary>
                  <div className="mt-4 space-y-3 border-t pt-4 text-sm">
                    <p className="text-on-surface-variant">{t(command.documentation.descriptionKey)}</p>
                    <Doc label={t("releaseConsole.build.produces")} value={t(command.documentation.producesKey)} />
                    <Doc label={t("releaseConsole.build.mutates")} value={t(command.documentation.mutatesKey)} />
                    <Doc label={t("releaseConsole.build.prerequisites")}
                      value={t(command.documentation.prerequisitesKey)} />
                    {command.id === "cap-build" ? <CapBuildGuide t={t} /> : null}
                    {command.parameters.map((schema) => (
                      <Parameter key={schema.name} command={command} schema={schema}
                        value={values[command.id]?.[schema.name]} t={t} onChange={change} />
                    ))}
                    {command.confirmationPhrase ? (
                      <Input value={confirmation} placeholder={command.confirmationPhrase} dir="ltr"
                        onChange={(event) => setConfirmations((current) => ({
                          ...current, [command.id]: event.target.value,
                        }))} />
                    ) : null}
                    {!ready?.ready ? <div className="rounded-md bg-muted p-2">
                      {t("releaseConsole.build.notReady", { names: ready?.missingEnv.join(", ") || "-" })}</div> : null}
                    {jobs.startError ? (
                      <div role="alert" className="rounded-md bg-error-container p-2 text-on-error-container">
                        {t("releaseConsole.errors.job")}: {jobs.startError}
                      </div>
                    ) : null}
                    {latestJob ? (
                      <div role="status" className="rounded-md bg-muted p-2 text-xs">
                        <strong><code dir="ltr">{latestJob.id}</code></strong>{" "}
                        {t(`releaseConsole.jobStatus.${latestJob.status}`)}
                      </div>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      {isCapSync ? (
                        <Button disabled={locked}
                          onClick={() => void jobs.start({ commandId: "cap-prepare-android" })}>
                          {locked ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                          ) : <Play className="h-4 w-4" />}
                          {locked
                            ? t("releaseConsole.jobStatus.running")
                            : t("releaseConsole.build.prepareAndroid")}
                        </Button>
                      ) : null}
                      <Button variant={command.danger === "publishes-live" ? "destructive" : "outline"}
                        disabled={locked || !ready?.ready || Boolean(
                          command.confirmationPhrase && confirmation !== command.confirmationPhrase,
                        )}
                        onClick={() => void jobs.start({ commandId: command.id,
                          parameters: values[command.id], confirmationPhrase: confirmation })}>
                        {locked ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : command.exclusive ? <LockKeyhole className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        {locked ? t("releaseConsole.jobStatus.running") : isCapSync
                          ? t("releaseConsole.build.syncExisting")
                          : t("releaseConsole.build.launch")}
                      </Button>
                      {command.id === "cap-build" || isCapSync ? (
                        <Button variant="outline" disabled={locked}
                          onClick={() => void jobs.start({ commandId: "cap-open-android" })}>
                          {locked ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                          ) : <FolderOpen className="h-4 w-4" />}
                          {locked
                            ? t("releaseConsole.jobStatus.running")
                            : t("releaseConsole.build.openAndroidStudio")}
                        </Button>
                      ) : <PreviewOutputButton t={t} />}
                      {isCapSync ? <PreviewOutputButton t={t} /> : null}
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        </section>
      ))}
    </section>
  );
}

function PreviewOutputButton({ t }: { t: (key: string) => string }) {
  // `window.open` instead of an anchor: embedded webviews ignore target="_blank".
  return <Button variant="outline" title="Open local static preview"
    onClick={() => window.open("http://127.0.0.1:5500/", "_blank", "noopener,noreferrer")}>
    <ExternalLink className="h-4 w-4" />{t("releaseConsole.build.preview")}
  </Button>;
}
