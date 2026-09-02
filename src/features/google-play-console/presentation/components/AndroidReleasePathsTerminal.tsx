"use client";

import * as React from "react";

import { NativeCore } from "@asol/native-core";
import type { BuildJobRecord } from "@asol/release-core/console";
import { DeployRunbookCollapsible } from "../DeployRunbookCollapsible";
import { parseAndroidReleaseLogSnapshot } from "../android-release-log-snapshot";
import { TerminalActions, TerminalOutput } from "../DeployRunbookTerminal";

function IndicatorCard(props: {
  label: string;
  value: string;
  help: string;
  className?: string;
} & { id?: string }) {
  return (
    <div id={props.id} className={props.className ?? ""}>
      <div id={props.id ? `${props.id}-div-2-ese66d` : undefined} className="min-w-0 rounded-md border bg-surface p-3">
        <div id={props.id ? `${props.id}-div-3-7moolp` : undefined} className="text-xs text-on-surface-variant">{props.label}</div>
        <div id={props.id ? `${props.id}-div-4-soasvp` : undefined} className="mt-1 text-sm font-semibold break-words sm:text-base" dir="ltr">
          {props.value || "—"}
        </div>
        <p id={props.id ? `${props.id}-text-5-pxhirv` : undefined} className="mt-1 text-[11px] text-on-surface-variant break-words">{props.help}</p>
      </div>
    </div>
  );
}

export function AndroidReleasePathsTerminal(props: {
  log: string;
  clearLog: () => void;
  activeJob: BuildJobRecord | undefined;
  t: (key: string, params?: Record<string, string>) => string;
}) {
  const snapshot = React.useMemo(
    () => parseAndroidReleaseLogSnapshot(props.log, props.activeJob, props.t),
    [props.activeJob, props.log, props.t],
  );

  return (
    <section
      id='google-play-console-presentation-components-androidreleasepathsterminal-section-6-9ssxne'
      className="mt-3 grid min-w-0 grid-cols-1 gap-3"
    >
      <DeployRunbookCollapsible id='google-play-console-presentation-components-androidreleasepathsterminal-deployrunbookcollapsible-7-nmon4k'
        title={props.t("releaseConsole.androidPaths.executionIndicatorsTitle")}
        description={props.t("releaseConsole.androidPaths.executionIndicatorsHelp")}
      >
        <div
          id='google-play-console-presentation-components-androidreleasepathsterminal-div-8-o5vatk'
          className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5"
        >
          <IndicatorCard id='google-play-console-presentation-components-androidreleasepathsterminal-indicatorcard-9-7czupx'
            label={props.t("releaseConsole.androidPaths.indicatorStatus")}
            value={snapshot.status}
            help={props.t("releaseConsole.androidPaths.indicatorStatusHelp")}
          />
          <IndicatorCard id='google-play-console-presentation-components-androidreleasepathsterminal-indicatorcard-10-ddpuau'
            label={props.t("releaseConsole.androidPaths.indicatorCommand")}
            value={snapshot.command}
            help={props.t("releaseConsole.androidPaths.indicatorCommandHelp")}
          />
          <IndicatorCard id='google-play-console-presentation-components-androidreleasepathsterminal-indicatorcard-11-cnv9ic'
            label={props.t("releaseConsole.androidPaths.indicatorPhase")}
            value={snapshot.phase}
            help={props.t("releaseConsole.androidPaths.indicatorPhaseHelp")}
          />
          <IndicatorCard id='google-play-console-presentation-components-androidreleasepathsterminal-indicatorcard-12-mdyuc6'
            label={props.t("releaseConsole.androidPaths.indicatorSection")}
            value={snapshot.section}
            help={props.t("releaseConsole.androidPaths.indicatorSectionHelp")}
          />
          <IndicatorCard id='google-play-console-presentation-components-androidreleasepathsterminal-indicatorcard-13-zw04by'
            label={props.t("releaseConsole.androidPaths.indicatorBranch")}
            value={snapshot.branch}
            help={props.t("releaseConsole.androidPaths.indicatorBranchHelp")}
            className="sm:col-span-2 xl:col-span-1"
          />
        </div>
      </DeployRunbookCollapsible>

      <DeployRunbookCollapsible id='google-play-console-presentation-components-androidreleasepathsterminal-deployrunbookcollapsible-14-y7pdts'
        title={props.t("releaseConsole.androidPaths.terminalTitle")}
        description={props.t("releaseConsole.androidPaths.terminalHelp")}
        actions={
          <TerminalActions id='google-play-console-presentation-components-androidreleasepathsterminal-terminalactions-15-3lik5a'
            onCopy={() => void NativeCore.writeClipboard({ string: props.log })}
            onClear={props.clearLog}
          />
        }
      >
        <TerminalOutput id='google-play-console-presentation-components-androidreleasepathsterminal-terminaloutput-16-ymkiox' text={props.log} />
      </DeployRunbookCollapsible>
    </section>
  );
}
