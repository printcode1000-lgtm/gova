"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  BuildCommandCatalogEntry,
  BuildParameterName,
} from "@/modules/release-commands/domain/build-command-catalog";
import type { StartBuildJobInput } from "@/modules/release-commands/domain/build-job-types";
import type { ReleaseVersionSnapshot } from "@/modules/release-commands/domain/build-job-types";
import { Parameter } from "./CommandParameterFields";
import { ReleaseCurrentVersions, ReleaseSelectedVersions } from "./ReleaseVersionSummary";

/**
 * Single confirmation step shared by every command button on the console.
 * Nothing runs until the user confirms here.
 */
export function ReleaseCommandConfirmDialog({
  pending, catalog, versions, locked, t, onConfirm, onCancel,
}: {
  pending: StartBuildJobInput | null;
  catalog: readonly BuildCommandCatalogEntry[];
  versions: ReleaseVersionSnapshot;
  locked: boolean;
  t: (key: string) => string;
  onConfirm: (overrides?: Partial<StartBuildJobInput>) => void;
  onCancel: () => void;
}) {
  const command = catalog.find((item) => item.id === pending?.commandId);
  const title = command ? t(command.documentation.titleKey) : pending?.commandId ?? "";
  const [phrase, setPhrase] = React.useState("");
  const [parameters, setParameters] = React.useState<Record<string, unknown>>({});
  const requiredPhrase = command?.confirmationPhrase ?? "";
  const minimumNativeVersionRequired = command?.id === "ota-publish";
  const minimumNativeVersionSatisfied = !minimumNativeVersionRequired
    || (typeof parameters.minimumNativeVersion === "string"
      && parameters.minimumNativeVersion.trim().length > 0);
  const requiredParametersSatisfied = !command || command.parameters.every((schema) => {
    if (!("required" in schema) || !schema.required) return true;
    const value = parameters[schema.name];
    return value !== undefined && value !== "" && value !== null;
  });
  // A phrase already typed on the command card counts; otherwise ask here.
  const phraseSatisfied = !requiredPhrase
    || pending?.confirmationPhrase === requiredPhrase
    || phrase === requiredPhrase;

  // Shortcut cards only provide the command id, while expanded command cards
  // may already provide parameter values. Keep both paths inside the same
  // confirmation surface so a safety-critical option cannot disappear merely
  // because the command was launched from a shortcut.
  React.useEffect(() => {
    setPhrase("");
    setParameters(pending?.parameters ?? {});
  }, [pending]);

  const changeParameter = (_commandId: string, name: BuildParameterName, value: unknown) => {
    setParameters((current) => ({ ...current, [name]: value }));
  };

  return (
    <Dialog open={Boolean(pending)} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent
        className="max-h-[calc(100dvh-1rem)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden sm:max-w-2xl"
        // A confirmation must be answered deliberately: clicking away or losing
        // focus never dismisses it, only the buttons below do.
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        onFocusOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{t("releaseConsole.confirmRun.title")}</DialogTitle>
          <DialogDescription>{t("releaseConsole.confirmRun.body")}</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 space-y-4 overflow-y-auto overscroll-contain pe-1 text-sm">
          <section className="space-y-2 rounded-lg border bg-surface-container-low p-3">
            <p className="text-base font-bold">{title}</p>
            {command ? <>
              <p className="leading-6 text-on-surface-variant">
                {t(command.documentation.descriptionKey)}
              </p>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <code className="rounded-md bg-muted px-2 py-1" dir="ltr">
                  npm run {command.script}
                </code>
                <span className="rounded-md bg-muted px-2 py-1">
                  {t("releaseConsole.confirmRun.estimatedDuration")}: {command.estimatedDuration}
                </span>
              </div>
            </> : null}
          </section>
          <ReleaseCurrentVersions versions={versions} t={t} />
          {command?.danger !== "safe" ? (
            <p className="flex items-center gap-2 rounded-md bg-error-container p-2 text-on-error-container">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {t("releaseConsole.confirmRun.danger")}
            </p>
          ) : null}
          {command?.parameters.length ? (
            <div className="space-y-2">
              {command.parameters.map((schema) => (
                <Parameter key={schema.name} command={command} schema={schema}
                  value={parameters[schema.name]} t={t} onChange={changeParameter} />
              ))}
            </div>
          ) : null}
          {command ? <ReleaseSelectedVersions commandId={command.id}
            versions={versions} parameters={parameters} t={t} /> : null}
          {minimumNativeVersionRequired && !minimumNativeVersionSatisfied ? (
            <p role="alert" className="rounded-md bg-error-container p-2 text-on-error-container">
              {t("releaseConsole.confirmRun.minimumNativeVersionRequired")}
            </p>
          ) : null}
          {!requiredParametersSatisfied ? (
            <p role="alert" className="rounded-md bg-error-container p-2 text-on-error-container">
              {t("releaseConsole.confirmRun.requiredParametersMissing")}
            </p>
          ) : null}
          {requiredPhrase && pending?.confirmationPhrase !== requiredPhrase ? (
            <div className="space-y-1">
              <p>{t("releaseConsole.build.confirmationExact").replace("{{phrase}}", requiredPhrase)}</p>
              <Input value={phrase} placeholder={requiredPhrase} dir="ltr"
                onChange={(event) => setPhrase(event.target.value)} />
            </div>
          ) : null}
          {locked ? (
            <p className="rounded-md bg-muted p-2">{t("releaseConsole.confirmRun.locked")}</p>
          ) : null}
        </div>
        <DialogFooter className="border-t pt-3">
          <Button variant="outline" onClick={onCancel}>{t("releaseConsole.confirmRun.cancel")}</Button>
          {/* Disabled while another job holds the page, so confirming late
              cannot start a second command. */}
          <Button disabled={locked || !phraseSatisfied
            || !minimumNativeVersionSatisfied || !requiredParametersSatisfied}
            onClick={() => onConfirm({
              parameters: { ...(pending?.parameters ?? {}), ...parameters },
              ...(requiredPhrase ? { confirmationPhrase: requiredPhrase } : {}),
            })}>
            {t("releaseConsole.confirmRun.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
