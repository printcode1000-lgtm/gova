"use client";

import * as React from "react";
import { CheckSquare, Square } from "lucide-react";

import { Button } from "@/shared/ui/button";
import type { DeployRunbookPhaseView } from "./DeployRunbookTypes";
import { DeployRunbookCollapsible } from "./DeployRunbookCollapsible";
import { branchIdsFromRunbook, dangerousBranchIds, PhaseBlock } from "./DeployRunbookPhaseTree";

import {
  PHASE_TREE_DESCRIPTION,
  RUN_OPTIONS_DESCRIPTION,
  RUN_OPTIONS_TITLE,
  SCENARIO_FOOTNOTE,
  SCENARIO_HELP,
} from "./deploy-runbook-labels";

const SELECT_BTN = "h-auto w-full min-w-0 justify-start whitespace-normal py-2 text-left";

export function RunbookPanel(
  props: {
    title: string;
    description: string;
    runbook: readonly DeployRunbookPhaseView[];
    help: Record<string, string>;
    selected: Set<string>;
    setSelected: (next: Set<string>) => void;
    scenarioLabel: string;
    scenarioValue: string;
    onScenarioChange: (value: string) => void;
    scenarios: readonly (readonly [string, string])[];
    extraOptions?: React.ReactNode;
  } & { id?: string },
) {
  const toggle = (id: string) => {
    const next = new Set(props.selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    props.setSelected(next);
  };
  const allIds = branchIdsFromRunbook(props.runbook);
  const dangerousIds = dangerousBranchIds(props.runbook);
  const safeIds = allIds.filter((id) => !dangerousIds.includes(id));
  const selectedInRunbook = allIds.filter((id) => props.selected.has(id)).length;

  return (
    <section id={props.id} className="min-w-0 space-y-3">
      <header id="features-google-play-console-presentation-deployrunbookcontrols-header-2-i9cwes" className="min-w-0 rounded-md border bg-surface p-3 sm:p-4">
        <h2 id="features-google-play-console-presentation-deployrunbookcontrols-heading-3-ldt014" className="text-lg font-semibold break-words sm:text-xl">{props.title}</h2>
        <p id="features-google-play-console-presentation-deployrunbookcontrols-text-4-ajg7ss" className="mt-1 text-sm text-on-surface-variant break-words">{props.description}</p>
      </header>

      <DeployRunbookCollapsible id="deploy-runbook-controls-runbook-panel-deploy-runbook-collapsible-5a95f3"
        title="وضع التشغيل"
        description={SCENARIO_HELP}
      >
        <ScenarioSelect
          label={props.scenarioLabel}
          value={props.scenarioValue}
          onChange={props.onScenarioChange}
          scenarios={props.scenarios}
        />
      </DeployRunbookCollapsible>

      <DeployRunbookCollapsible id="deploy-runbook-controls-runbook-panel-deploy-runbook-collapsible-cad13f"
        title="اختيار الفروع"
        description="تفعيل أو تجاوز الفروع دفعة واحدة قبل فتح شجرة المراحل."
        badge={
          <span id="features-google-play-console-presentation-deployrunbookcontrols-text-5-ei2r2a" className="rounded-full bg-muted px-2 py-0.5 text-xs text-on-surface-variant">
            {selectedInRunbook} / {allIds.length}
          </span>
        }
      >
        <div id="features-google-play-console-presentation-deployrunbookcontrols-div-6-ubxh7z" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button variant="outline" className={SELECT_BTN} onClick={() => props.setSelected(new Set(allIds))}>
            <CheckSquare className="h-4 w-4 shrink-0" />
            تفعيل الكل
          </Button>
          <Button variant="outline" className={SELECT_BTN} onClick={() => props.setSelected(new Set())}>
            <Square className="h-4 w-4 shrink-0" />
            تجاوز الكل
          </Button>
          <Button variant="outline" className={SELECT_BTN} onClick={() => props.setSelected(new Set(safeIds))}>
            الفروع الآمنة فقط
          </Button>
          <Button variant="outline" className={SELECT_BTN} onClick={() => props.setSelected(new Set(dangerousIds))}>
            الفروع الحساسة فقط
          </Button>
        </div>
      </DeployRunbookCollapsible>

      {props.extraOptions ? (
        <DeployRunbookCollapsible id="deploy-runbook-controls-runbook-panel-deploy-runbook-collapsible-357988" title={RUN_OPTIONS_TITLE} description={RUN_OPTIONS_DESCRIPTION}>
          <div id="features-google-play-console-presentation-deployrunbookcontrols-div-7-5bhmhk" className="grid grid-cols-1 gap-2 lg:grid-cols-2">{props.extraOptions}</div>
        </DeployRunbookCollapsible>
      ) : null}

      <DeployRunbookCollapsible id="deploy-runbook-controls-runbook-panel-deploy-runbook-collapsible-cc7974"
        title="شجرة المراحل والفروع"
        description={PHASE_TREE_DESCRIPTION}
        badge={
          <span id="features-google-play-console-presentation-deployrunbookcontrols-text-8-j3oyhb" className="rounded-full bg-muted px-2 py-0.5 text-xs text-on-surface-variant">
            {props.runbook.length} مراحل
          </span>
        }
      >
        <div id="features-google-play-console-presentation-deployrunbookcontrols-div-9-tzpee6" className="space-y-3">
          {props.runbook.map((phase) => (
            <PhaseBlock key={phase.id} phase={phase} selected={props.selected} help={props.help} onToggle={toggle} />
          ))}
        </div>
      </DeployRunbookCollapsible>
    </section>
  );
}

export function Option(
  props: {
    checked: boolean;
    onChange: (value: boolean) => void;
    label: string;
    help: string;
  } & { id?: string },
) {
  return (
    <label id={props.id} className="block min-w-0 w-full rounded-md border bg-surface p-3 text-sm">
      <span id={props.id ? `${props.id}-text-11-exqq4b` : undefined} className="flex items-start gap-2">
        <input id={props.id ? `${props.id}-input-12-qrac8u` : undefined}
          type="checkbox"
          className="mt-0.5 shrink-0"
          checked={props.checked}
          onChange={(event) => props.onChange(event.target.checked)}
        />
        <span id={props.id ? `${props.id}-text-13-ikfjlc` : undefined} className="min-w-0 font-medium break-words">{props.label}</span>
      </span>
      <span id={props.id ? `${props.id}-text-14-gxltb6` : undefined} className="mt-1 block text-xs text-on-surface-variant break-words">{props.help}</span>
    </label>
  );
}

function ScenarioSelect(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  scenarios: readonly (readonly [string, string])[];
}) {
  return (
    <label id="features-google-play-console-presentation-deployrunbookcontrols-label-15-xw5h8i" className="block space-y-2 text-sm">
      <span id="features-google-play-console-presentation-deployrunbookcontrols-text-16-tiw69r" className="font-medium">{props.label}</span>
      <select id="features-google-play-console-presentation-deployrunbookcontrols-select-17-r96yrm"
        className="block w-full min-w-0 max-w-full rounded-md border bg-background p-2 md:max-w-md"
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      >
        {props.scenarios.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <span id="features-google-play-console-presentation-deployrunbookcontrols-text-18-bywyfa" className="block text-xs text-on-surface-variant">
        {SCENARIO_FOOTNOTE}
      </span>
    </label>
  );
}
