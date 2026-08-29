"use client";

import { NativeCore } from "@asol/native-core";
import { DeployRunbookCollapsible } from "./DeployRunbookCollapsible";
import { ExecutionBox } from "./DeployRunbookExecutionBox";
import { ExecutionIndicator, TerminalActions, TerminalOutput } from "./DeployRunbookTerminal";
import type { DeployTab } from "./DeployRunbookTypes";
import { uiAttributes } from "@asol/ui-registry-core";

export function DeployRunbookMainGrid(props: {
  tab: DeployTab;
  log: string;
  clearLog: () => void;
  activeJob: unknown;
  activeStatus: string;
  locked: boolean;
  exactPhrase: string;
  confirmation: string;
  setConfirmation: (value: string) => void;
  commandPreview: string;
  allowEmpty: boolean;
  setAllowEmpty: (value: boolean) => void;
  allowManifestDowngrade: boolean;
  setAllowManifestDowngrade: (value: boolean) => void;
  allowScratchFiles: boolean;
  setAllowScratchFiles: (value: boolean) => void;
  startError: string;
  onStart: () => void;
  onCancel: () => void;
}) {
  return (
    <section {...uiAttributes({ uid: "google-play-console.deploy-runbook-main-grid.section.2-f4PhmV", id: "google-play-console.deploy-runbook-main-grid.section.2" })} id="google-play-console.deploy-runbook-main-grid.section" className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)] lg:gap-4">
      <div {...uiAttributes({ uid: "google-play-console.deploy-runbook-main-grid.div.3-Ud55Pm", id: "google-play-console.deploy-runbook-main-grid.div.3" })} id="google-play-console.deploy-runbook-main-grid.div" className="order-2 min-w-0 space-y-3 lg:order-1">
        <DeployRunbookCollapsible id="google-play-console.deploy-runbook-main-grid.deploy-runbook-collapsible"
          title="مؤشرات التنفيذ"
          description="آخر مرحلة وقسم وفرع ظهر في سجل الطرفية."
        >
          <ExecutionIndicator id="google-play-console.deploy-runbook-main-grid.execution-indicator" log={props.log} tab={props.tab} status={props.activeStatus} />
        </DeployRunbookCollapsible>

        <DeployRunbookCollapsible id="google-play-console.deploy-runbook-main-grid.deploy-runbook-collapsible.2"
          title="الطرفية"
          description="سجل job النظام المحلي؛ يُحدَّث أثناء التشغيل."
          actions={
            <TerminalActions id="google-play-console.deploy-runbook-main-grid.terminal-actions"
              onCopy={() => void NativeCore.writeClipboard({ string: props.log })}
              onClear={props.clearLog}
            />
          }
        >
          <TerminalOutput id="google-play-console.deploy-runbook-main-grid.terminal-output" text={props.log} />
        </DeployRunbookCollapsible>
      </div>

      <div {...uiAttributes({ uid: "google-play-console.deploy-runbook-main-grid.div.4-lUD60I", id: "google-play-console.deploy-runbook-main-grid.div.4" })} id="google-play-console.deploy-runbook-main-grid.div.2" className="order-1 min-w-0 lg:order-2">
        <ExecutionBox
          locked={props.locked}
          activeJob={props.activeJob}
          exactPhrase={props.exactPhrase}
          confirmation={props.confirmation}
          setConfirmation={props.setConfirmation}
          commandPreview={props.commandPreview}
          allowEmpty={props.allowEmpty}
          setAllowEmpty={props.setAllowEmpty}
          allowManifestDowngrade={props.allowManifestDowngrade}
          setAllowManifestDowngrade={props.setAllowManifestDowngrade}
          allowScratchFiles={props.allowScratchFiles}
          setAllowScratchFiles={props.setAllowScratchFiles}
          startError={props.startError}
          onStart={props.onStart}
          onCancel={props.onCancel}
        />
      </div>
    </section>
  );
}
