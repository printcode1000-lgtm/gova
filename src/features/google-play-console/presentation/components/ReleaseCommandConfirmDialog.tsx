"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import type { BuildCommandCatalogEntry, BuildParameterName } from "@asol/release-core/console";
import type { StartBuildJobInput } from "@asol/release-core/console";
import type { ReleaseVersionSnapshot } from "@asol/release-core/console";
import { Parameter } from "./CommandParameterFields";
import { ReleaseCommandConfirmBlockers } from "./ReleaseCommandConfirmBlockers";
import { ReleaseCommandSummary } from "./ReleaseCommandSummary";
import { ReleaseCurrentVersions, ReleaseSelectedVersions } from "./ReleaseVersionSummary";

/**
 * Single confirmation step shared by every command button on the console.
 * Nothing runs until the user confirms here.
 */
export function ReleaseCommandConfirmDialog({
  pending,
  catalog,
  versions,
  locked,
  t,
  onConfirm,
  onCancel,
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
  const title = command ? t(command.documentation.titleKey) : (pending?.commandId ?? "");
  const [phrase, setPhrase] = React.useState("");
  const [parameters, setParameters] = React.useState<Record<string, unknown>>({});
  const requiredPhrase = command?.confirmationPhrase ?? "";
  const minimumNativeVersionRequired = command?.id === "ota-publish";
  const minimumNativeVersionSatisfied =
    !minimumNativeVersionRequired ||
    (typeof parameters.minimumNativeVersion === "string" && parameters.minimumNativeVersion.trim().length > 0);
  const requiredParametersSatisfied =
    !command ||
    command.parameters.every((schema) => {
      if (!("required" in schema) || !schema.required) return true;
      const value = parameters[schema.name];
      return value !== undefined && value !== "" && value !== null;
    });
  // A phrase already typed on the command card counts; otherwise ask here.
  const phraseSatisfied =
    !requiredPhrase || pending?.confirmationPhrase === requiredPhrase || phrase === requiredPhrase;

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
    <Dialog
      open={Boolean(pending)}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent
        id="google-play-console.release-command-confirm-dialog.dialog-content"
        className="max-h-[calc(100dvh-1rem)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden sm:max-w-2xl"
        // A confirmation must be answered deliberately: clicking away or losing
        // focus never dismisses it, only the buttons below do.
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        onFocusOutside={(event) => event.preventDefault()}
      >
        <DialogHeader id="google-play-console.release-command-confirm-dialog.dialog-header">
          <DialogTitle id="google-play-console.release-command-confirm-dialog.dialog-title">
            {t("releaseConsole.confirmRun.title")}
          </DialogTitle>
          <DialogDescription id="google-play-console.release-command-confirm-dialog.dialog-description">
            {t("releaseConsole.confirmRun.body")}
          </DialogDescription>
        </DialogHeader>
        <div
          id="google-play-console.release-command-confirm-dialog.div"
          className="min-h-0 space-y-4 overflow-y-auto overscroll-contain pe-1 text-sm"
        >
          <ReleaseCommandSummary title={title} command={command} t={t} />
          <ReleaseCurrentVersions
            id="google-play-console.release-command-confirm-dialog.release-current-versions"
            versions={versions}
            t={t}
          />
          {command?.danger !== "safe" ? (
            <p
              id="google-play-console.release-command-confirm-dialog.p.3"
              className="flex items-center gap-2 rounded-md bg-error-container p-2 text-on-error-container"
            >
              <AlertTriangle
                id="google-play-console.release-command-confirm-dialog.alert-triangle"
                className="h-4 w-4 shrink-0"
              />
              {t("releaseConsole.confirmRun.danger")}
            </p>
          ) : null}
          {command?.parameters.length ? (
            <div id="google-play-console.release-command-confirm-dialog.div.3" className="space-y-2">
              {command.parameters.map((schema) => (
                <Parameter
                  key={schema.name}
                  command={command}
                  schema={schema}
                  value={parameters[schema.name]}
                  t={t}
                  onChange={changeParameter}
                />
              ))}
            </div>
          ) : null}
          {command ? (
            <ReleaseSelectedVersions
              id="google-play-console.release-command-confirm-dialog.release-selected-versions"
              commandId={command.id}
              versions={versions}
              parameters={parameters}
              t={t}
            />
          ) : null}
          <ReleaseCommandConfirmBlockers
            minimumNativeVersionRequired={minimumNativeVersionRequired}
            minimumNativeVersionSatisfied={minimumNativeVersionSatisfied}
            requiredParametersSatisfied={requiredParametersSatisfied}
            requiredPhrase={requiredPhrase}
            confirmedPhrase={pending?.confirmationPhrase}
            phrase={phrase}
            onPhraseChange={setPhrase}
            locked={locked}
            t={t}
          />
        </div>
        <DialogFooter id="google-play-console.release-command-confirm-dialog.dialog-footer" className="border-t pt-3">
          <Button id="google-play-console.release-command-confirm-dialog.button" variant="outline" onClick={onCancel}>
            {t("releaseConsole.confirmRun.cancel")}
          </Button>
          {/* Disabled while another job holds the page, so confirming late
              cannot start a second command. */}
          <Button
            id="google-play-console.release-command-confirm-dialog.button.2"
            disabled={locked || !phraseSatisfied || !minimumNativeVersionSatisfied || !requiredParametersSatisfied}
            onClick={() =>
              onConfirm({
                parameters: { ...(pending?.parameters ?? {}), ...parameters },
                ...(requiredPhrase ? { confirmationPhrase: requiredPhrase } : {}),
              })
            }
          >
            {t("releaseConsole.confirmRun.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
