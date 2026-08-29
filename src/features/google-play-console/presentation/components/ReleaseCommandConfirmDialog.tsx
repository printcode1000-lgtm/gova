"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import type {
  BuildCommandCatalogEntry,
  BuildParameterName,
} from "@asol/release-core/console";
import type { StartBuildJobInput } from "@asol/release-core/console";
import type { ReleaseVersionSnapshot } from "@asol/release-core/console";
import { Parameter } from "./CommandParameterFields";
import { ReleaseCurrentVersions, ReleaseSelectedVersions } from "./ReleaseVersionSummary";
import { uiAttributes } from "@asol/ui-registry-core";

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
      <DialogContent id="google-play-console.release-command-confirm-dialog.dialog-content"
        className="max-h-[calc(100dvh-1rem)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden sm:max-w-2xl"
        // A confirmation must be answered deliberately: clicking away or losing
        // focus never dismisses it, only the buttons below do.
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        onFocusOutside={(event) => event.preventDefault()}
      >
        <DialogHeader ui={{ uid: "google-play-console.release-command-confirm-dialog.dialog-header.2-1jjy7W", id: "google-play-console.release-command-confirm-dialog.dialog-header.2" }} id="google-play-console.release-command-confirm-dialog.dialog-header">
          <DialogTitle ui={{ uid: "google-play-console.release-command-confirm-dialog.dialog-title.2-T28Qx0", id: "google-play-console.release-command-confirm-dialog.dialog-title.2" }} id="google-play-console.release-command-confirm-dialog.dialog-title">{t("releaseConsole.confirmRun.title")}</DialogTitle>
          <DialogDescription ui={{ uid: "google-play-console.release-command-confirm-dialog.dialog-description.2-8iNrZW", id: "google-play-console.release-command-confirm-dialog.dialog-description.2" }} id="google-play-console.release-command-confirm-dialog.dialog-description">{t("releaseConsole.confirmRun.body")}</DialogDescription>
        </DialogHeader>
        <div {...uiAttributes({ uid: "google-play-console.release-command-confirm-dialog.div.5-HRW3by", id: "google-play-console.release-command-confirm-dialog.div.5" })} id="google-play-console.release-command-confirm-dialog.div" className="min-h-0 space-y-4 overflow-y-auto overscroll-contain pe-1 text-sm">
          <section {...uiAttributes({ uid: "google-play-console.release-command-confirm-dialog.section.2-3o4bMk", id: "google-play-console.release-command-confirm-dialog.section.2" })} id="google-play-console.release-command-confirm-dialog.section" className="space-y-2 rounded-lg border bg-surface-container-low p-3">
            <p {...uiAttributes({ uid: "google-play-console.release-command-confirm-dialog.p.8-OkWU58", id: "google-play-console.release-command-confirm-dialog.p.8" })} id="google-play-console.release-command-confirm-dialog.p" className="text-base font-bold">{title}</p>
            {command ? <>
              <p {...uiAttributes({ uid: "google-play-console.release-command-confirm-dialog.p.9-K6Bdyr", id: "google-play-console.release-command-confirm-dialog.p.9" })} id="google-play-console.release-command-confirm-dialog.p.2" className="leading-6 text-on-surface-variant">
                {t(command.documentation.descriptionKey)}
              </p>
              <div {...uiAttributes({ uid: "google-play-console.release-command-confirm-dialog.div.6-VDlmq1", id: "google-play-console.release-command-confirm-dialog.div.6" })} id="google-play-console.release-command-confirm-dialog.div.2" className="flex flex-wrap items-center gap-2 text-xs">
                <code {...uiAttributes({ uid: "google-play-console.release-command-confirm-dialog.code-2IUlHu", id: "google-play-console.release-command-confirm-dialog.code" })} className="rounded-md bg-muted px-2 py-1" dir="ltr">
                  npm run {command.script}
                </code>
                <span {...uiAttributes({ uid: "google-play-console.release-command-confirm-dialog.span.2-1ub90F", id: "google-play-console.release-command-confirm-dialog.span.2" })} id="google-play-console.release-command-confirm-dialog.span" className="rounded-md bg-muted px-2 py-1">
                  {t("releaseConsole.confirmRun.estimatedDuration")}: {command.estimatedDuration}
                </span>
              </div>
            </> : null}
          </section>
          <ReleaseCurrentVersions id="google-play-console.release-command-confirm-dialog.release-current-versions" versions={versions} t={t} />
          {command?.danger !== "safe" ? (
            <p {...uiAttributes({ uid: "google-play-console.release-command-confirm-dialog.p.10-DdXZ1o", id: "google-play-console.release-command-confirm-dialog.p.10" })} id="google-play-console.release-command-confirm-dialog.p.3" className="flex items-center gap-2 rounded-md bg-error-container p-2 text-on-error-container">
              <AlertTriangle id="google-play-console.release-command-confirm-dialog.alert-triangle" className="h-4 w-4 shrink-0" />
              {t("releaseConsole.confirmRun.danger")}
            </p>
          ) : null}
          {command?.parameters.length ? (
            <div {...uiAttributes({ uid: "google-play-console.release-command-confirm-dialog.div.7-H09wNJ", id: "google-play-console.release-command-confirm-dialog.div.7" })} id="google-play-console.release-command-confirm-dialog.div.3" className="space-y-2">
              {command.parameters.map((schema) => (
                <Parameter key={schema.name} command={command} schema={schema}
                  value={parameters[schema.name]} t={t} onChange={changeParameter} />
              ))}
            </div>
          ) : null}
          {command ? <ReleaseSelectedVersions id="google-play-console.release-command-confirm-dialog.release-selected-versions" commandId={command.id}
            versions={versions} parameters={parameters} t={t} /> : null}
          {minimumNativeVersionRequired && !minimumNativeVersionSatisfied ? (
            <p {...uiAttributes({ uid: "google-play-console.release-command-confirm-dialog.p.11-Sv77RI", id: "google-play-console.release-command-confirm-dialog.p.11" })} id="google-play-console.release-command-confirm-dialog.p.4" role="alert" className="rounded-md bg-error-container p-2 text-on-error-container">
              {t("releaseConsole.confirmRun.minimumNativeVersionRequired")}
            </p>
          ) : null}
          {!requiredParametersSatisfied ? (
            <p {...uiAttributes({ uid: "google-play-console.release-command-confirm-dialog.p.12-Tmqg21", id: "google-play-console.release-command-confirm-dialog.p.12" })} id="google-play-console.release-command-confirm-dialog.p.5" role="alert" className="rounded-md bg-error-container p-2 text-on-error-container">
              {t("releaseConsole.confirmRun.requiredParametersMissing")}
            </p>
          ) : null}
          {requiredPhrase && pending?.confirmationPhrase !== requiredPhrase ? (
            <div {...uiAttributes({ uid: "google-play-console.release-command-confirm-dialog.div.8-gNQ8YB", id: "google-play-console.release-command-confirm-dialog.div.8" })} id="google-play-console.release-command-confirm-dialog.div.4" className="space-y-1">
              <p {...uiAttributes({ uid: "google-play-console.release-command-confirm-dialog.p.13-I5TTG2", id: "google-play-console.release-command-confirm-dialog.p.13" })} id="google-play-console.release-command-confirm-dialog.p.6">{t("releaseConsole.build.confirmationExact").replace("{{phrase}}", requiredPhrase)}</p>
              <Input id="google-play-console.release-command-confirm-dialog.input"
                ui={{
                  uid: "release-console.confirm-dialog.phrase-omuI3X",
                  id: "release-console.confirm-dialog.phrase",
                  kind: "field",
                  part: "confirmation",
                }} value={phrase} placeholder={requiredPhrase} dir="ltr"
                onChange={(event) => setPhrase(event.target.value)} />
            </div>
          ) : null}
          {locked ? (
            <p {...uiAttributes({ uid: "google-play-console.release-command-confirm-dialog.p.14-W67PrN", id: "google-play-console.release-command-confirm-dialog.p.14" })} id="google-play-console.release-command-confirm-dialog.p.7" className="rounded-md bg-muted p-2">{t("releaseConsole.confirmRun.locked")}</p>
          ) : null}
        </div>
        <DialogFooter ui={{ uid: "google-play-console.release-command-confirm-dialog.dialog-footer.2-1GbJYC", id: "google-play-console.release-command-confirm-dialog.dialog-footer.2" }} id="google-play-console.release-command-confirm-dialog.dialog-footer" className="border-t pt-3">
          <Button id="google-play-console.release-command-confirm-dialog.button"
            ui={{
              uid: "release-console.confirm-dialog.cancel-l5VVLg",
              id: "release-console.confirm-dialog.cancel",
              kind: "action",
              action: "cancel",
              part: "footer",
            }} variant="outline" onClick={onCancel}>{t("releaseConsole.confirmRun.cancel")}</Button>
          {/* Disabled while another job holds the page, so confirming late
              cannot start a second command. */}
          <Button id="google-play-console.release-command-confirm-dialog.button.2"
            ui={{
              uid: "release-console.confirm-dialog.confirm-M9XOdo",
              id: "release-console.confirm-dialog.confirm",
              kind: "action",
              action: "confirm-run",
              part: "footer",
            }} disabled={locked || !phraseSatisfied
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
