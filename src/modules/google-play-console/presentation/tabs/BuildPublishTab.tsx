"use client";

import * as React from "react";
import { ChevronDown, ExternalLink, LoaderCircle, LockKeyhole, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/lib/i18n";
import type {
  BuildCommandCatalogEntry,
  BuildParameterName,
} from "@/modules/release-commands/domain/build-command-catalog";
import { useReleaseJobs } from "../../hooks/use-release-jobs";

const CATEGORIES = ["web-static", "ota", "native-android", "verification", "fastlane"] as const;

export function BuildPublishTab() {
  const { t } = useTranslation();
  const jobs = useReleaseJobs();
  const [values, setValues] = React.useState<Record<string, Record<string, unknown>>>({});
  const [confirmations, setConfirmations] = React.useState<Record<string, string>>({});
  const activeJob = jobs.jobs.find((job) => job.status === "queued" || job.status === "running");
  const change = (id: string, name: BuildParameterName, value: unknown) => {
    setValues((current) => ({ ...current, [id]: { ...current[id], [name]: value } }));
  };
  return (
    <section className="space-y-5">
      {CATEGORIES.map((category) => (
        <section key={category} className="space-y-3">
          <h2 className="font-semibold">{t(`releaseConsole.categories.${category}`)}</h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {jobs.catalog.filter((item) => item.category === category).map((command) => {
              const ready = jobs.readiness.find((item) => item.commandId === command.id);
              const latestJob = jobs.jobs.find((job) => job.commandId === command.id);
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
                    {jobs.startError ? <div role="alert" className="rounded-md bg-error-container p-2 text-on-error-container">
                      {t("releaseConsole.errors.job")}: {jobs.startError}
                    </div> : null}
                    {latestJob ? <div role="status" className="rounded-md bg-muted p-2 text-xs">
                      <strong><code dir="ltr">{latestJob.id}</code></strong>{" "}
                      {t(`releaseConsole.jobStatus.${latestJob.status}`)}
                    </div> : null}
                    <div className="flex flex-wrap gap-2">
                      <Button variant={command.danger === "publishes-live" ? "destructive" : "outline"}
                        disabled={jobs.busy || Boolean(activeJob) || !ready?.ready || Boolean(
                          command.confirmationPhrase && confirmation !== command.confirmationPhrase,
                        )}
                        onClick={() => void jobs.start({ commandId: command.id,
                          parameters: values[command.id], confirmationPhrase: confirmation })}>
                        {jobs.busy || activeJob ? <LoaderCircle className="h-4 w-4 animate-spin" /> :
                          command.exclusive ? <LockKeyhole className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        {jobs.busy || activeJob ? t("releaseConsole.jobStatus.running") : t("releaseConsole.build.launch")}
                      </Button>
                      <Button asChild variant="outline" title="Open local static preview">
                        <a href="http://127.0.0.1:5500/" target="_blank" rel="noreferrer">
                          <ExternalLink className="h-4 w-4" />{t("releaseConsole.build.preview")}
                        </a>
                      </Button>
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

function Doc({ label, value }: { label: string; value: string }) {
  return <div><strong>{label}</strong><p className="text-on-surface-variant">{value}</p></div>;
}

function Parameter({ command, schema, value, t, onChange }: {
  command: BuildCommandCatalogEntry;
  schema: BuildCommandCatalogEntry["parameters"][number];
  value: unknown;
  t: (key: string) => string;
  onChange: (id: string, name: BuildParameterName, value: unknown) => void;
}) {
  if (schema.type === "boolean") return <label className="flex gap-2"><input type="checkbox"
    checked={value === true} onChange={(event) => onChange(command.id, schema.name, event.target.checked)} />
    {t(`releaseConsole.parameters.${schema.name}`)}</label>;
  if (schema.type === "string") return <Textarea value={String(value ?? "")}
    placeholder={t(`releaseConsole.parameters.${schema.name}`)}
    onChange={(event) => onChange(command.id, schema.name, event.target.value)} />;
  if (schema.type === "enum") return <select className="h-10 w-full rounded-md border bg-background px-3"
    value={String(value ?? "")} onChange={(event) => onChange(command.id, schema.name, event.target.value)}>
    <option value="">{t(`releaseConsole.parameters.${schema.name}`)}</option>
    {schema.values.map((item) => <option key={item}>{item}</option>)}</select>;
  if (schema.type === "number") return <Input type="number" min={schema.min} max={schema.max}
    value={typeof value === "number" ? value : ""}
    onChange={(event) => onChange(command.id, schema.name, Number(event.target.value))} />;
  return <Textarea placeholder={t("releaseConsole.parameters.releaseNotes")}
    onChange={(event) => onChange(command.id, schema.name, { en: event.target.value })} />;
}
