"use client";

import { NativeCore } from "@asol/native-core";
import { DeployRunbookCollapsible } from "./DeployRunbookCollapsible";
import { ExecutionBox } from "./DeployRunbookExecutionBox";
import { ExecutionIndicator, TerminalActions, TerminalOutput } from "./DeployRunbookTerminal";
import type { DeployTab } from "./DeployRunbookTypes";

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
    <section
      id='features-google-play-console-presentation-deployrunbookmaingrid-section-1-zg7vu1'
      className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)] lg:gap-4"
    >
      <div id='features-google-play-console-presentation-deployrunbookmaingrid-div-2-jv75vf' className="order-2 min-w-0 space-y-3 lg:order-1">
        <DeployRunbookCollapsible id='features-google-play-console-presentation-deployrunbookmaingrid-deployrunbookcollapsible-3-jagi2x'
          title="مؤشرات التنفيذ"
          description="آخر مرحلة وقسم وفرع ظهر في سجل الطرفية."
        >
          <ExecutionIndicator
            id='features-google-play-console-presentation-deployrunbookmaingrid-executionindicator-4-xozctu'
            log={props.log}
            tab={props.tab}
            status={props.activeStatus}
          />
        </DeployRunbookCollapsible>

        <DeployRunbookCollapsible id='features-google-play-console-presentation-deployrunbookmaingrid-deployrunbookcollapsible-5-dotgvz'
          title="الطرفية"
          description="سجل job النظام المحلي؛ يُحدَّث أثناء التشغيل."
          actions={
            <TerminalActions id='features-google-play-console-presentation-deployrunbookmaingrid-terminalactions-6-6xp6yl'
              onCopy={() => void NativeCore.writeClipboard({ string: props.log })}
              onClear={props.clearLog}
            />
          }
        >
          <TerminalOutput id='features-google-play-console-presentation-deployrunbookmaingrid-terminaloutput-7-chgxon' text={props.log} />
        </DeployRunbookCollapsible>
      </div>

      <div id='features-google-play-console-presentation-deployrunbookmaingrid-div-8-kx0p8p' className="order-1 min-w-0 lg:order-2">
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
