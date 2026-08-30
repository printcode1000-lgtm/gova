"use client";

import * as React from "react";
import { CheckSquare, Square } from "lucide-react";

import { Button } from "@/shared/ui/button";
import type { DeployRunbookPhaseView } from "./DeployRunbookTypes";
import { DeployRunbookCollapsible } from "./DeployRunbookCollapsible";
import {
  branchIdsFromRunbook,
  dangerousBranchIds,
  PhaseBlock,
} from "./DeployRunbookPhaseTree";
import { uiAttributes , createOpaqueUiInstanceId} from "@asol/ui-registry-core";

const SELECT_BTN =
  "h-auto w-full min-w-0 justify-start whitespace-normal py-2 text-left";

export function RunbookPanel(props: {
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
} & { id?: string }) {
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
    <section {...uiAttributes({ uid: "google-play-console.deploy-runbook-controls.section-pTX47t", id: "google-play-console.deploy-runbook-controls.section" })} id={props.id} className="min-w-0 space-y-3">
      <header {...uiAttributes({ uid: "google-play-console.deploy-runbook-controls.header-y9RljT", id: "google-play-console.deploy-runbook-controls.header" })} className="min-w-0 rounded-md border bg-surface p-3 sm:p-4">
        <h2 {...uiAttributes({ uid: "google-play-console.deploy-runbook-controls.h2-UmTM66", id: "google-play-console.deploy-runbook-controls.h2" })} className="text-lg font-semibold break-words sm:text-xl">{props.title}</h2>
        <p {...uiAttributes({ uid: "google-play-console.deploy-runbook-controls.p-1RFHqC", id: "google-play-console.deploy-runbook-controls.p" })} className="mt-1 text-sm text-on-surface-variant break-words">{props.description}</p>
      </header>

      <DeployRunbookCollapsible
        title="وضع التشغيل"
        description="يحدد السيناريو الأمر الأعلى؛ checkboxes الفروع تحدد ما يُنفَّذ داخل الشجرة."
      >
        <ScenarioSelect
          label={props.scenarioLabel}
          value={props.scenarioValue}
          onChange={props.onScenarioChange}
          scenarios={props.scenarios}
        />
      </DeployRunbookCollapsible>

      <DeployRunbookCollapsible
        title="اختيار الفروع"
        description="تفعيل أو تجاوز الفروع دفعة واحدة قبل فتح شجرة المراحل."
        badge={
          <span {...uiAttributes({ uid: "google-play-console.deploy-runbook-controls.span-EbU1Lm", id: "google-play-console.deploy-runbook-controls.span" })} className="rounded-full bg-muted px-2 py-0.5 text-xs text-on-surface-variant">
            {selectedInRunbook} / {allIds.length}
          </span>
        }
      >
        <div {...uiAttributes({ uid: "google-play-console.deploy-runbook-controls.div-Uv4XYH", id: "google-play-console.deploy-runbook-controls.div" })} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button ui={{ uid: "deploy-runbook.controls.select-all-v4wrX5", id: "deploy-runbook.controls.select-all", kind: "action", action: "select-all", part: "selection" }}
            variant="outline"
            className={SELECT_BTN}
            onClick={() => props.setSelected(new Set(allIds))}
          >
            <CheckSquare className="h-4 w-4 shrink-0" />
            تفعيل الكل
          </Button>
          <Button ui={{ uid: "deploy-runbook.controls.select-none-q9bRsA", id: "deploy-runbook.controls.select-none", kind: "action", action: "select-none", part: "selection" }}
            variant="outline"
            className={SELECT_BTN}
            onClick={() => props.setSelected(new Set())}
          >
            <Square className="h-4 w-4 shrink-0" />
            تجاوز الكل
          </Button>
          <Button ui={{ uid: "deploy-runbook.controls.select-safe-mSNY7v", id: "deploy-runbook.controls.select-safe", kind: "action", action: "select-safe", part: "selection" }}
            variant="outline"
            className={SELECT_BTN}
            onClick={() => props.setSelected(new Set(safeIds))}
          >
            الفروع الآمنة فقط
          </Button>
          <Button ui={{ uid: "deploy-runbook.controls.select-dangerous-9fJZtW", id: "deploy-runbook.controls.select-dangerous", kind: "action", action: "select-dangerous", part: "selection" }}
            variant="outline"
            className={SELECT_BTN}
            onClick={() => props.setSelected(new Set(dangerousIds))}
          >
            الفروع الحساسة فقط
          </Button>
        </div>
      </DeployRunbookCollapsible>

      {props.extraOptions ? (
        <DeployRunbookCollapsible
          title="خيارات التشغيل"
          description="سلوك التسلسل عند الأخطاء وتجاوز preflight."
        >
          <div {...uiAttributes({ uid: "google-play-console.deploy-runbook-controls.div.2-VJt2GO", id: "google-play-console.deploy-runbook-controls.div.2" })} className="grid grid-cols-1 gap-2 lg:grid-cols-2">{props.extraOptions}</div>
        </DeployRunbookCollapsible>
      ) : null}

      <DeployRunbookCollapsible
        title="شجرة المراحل والفروع"
        description="كل مرحلة قابلة للطي؛ داخلها أقسام ثم فروع تنفيذية بأوامر npm."
        badge={
          <span {...uiAttributes({ uid: "google-play-console.deploy-runbook-controls.span.2-cXuA0r", id: "google-play-console.deploy-runbook-controls.span.2" })} className="rounded-full bg-muted px-2 py-0.5 text-xs text-on-surface-variant">
            {props.runbook.length} مراحل
          </span>
        }
      >
        <div {...uiAttributes({ uid: "google-play-console.deploy-runbook-controls.div.3-1zfGaU", id: "google-play-console.deploy-runbook-controls.div.3" })} className="space-y-3">
          {props.runbook.map((phase) => (
            <PhaseBlock
              key={phase.id}
              phase={phase}
              selected={props.selected}
              help={props.help}
              onToggle={toggle}
            />
          ))}
        </div>
      </DeployRunbookCollapsible>
    </section>
  );
}

export function Option(props: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  help: string;
} & { id?: string }) {
  return (
    <label {...uiAttributes({ uid: "google-play-console.deploy-runbook-controls.label-Y2nOg9", id: "google-play-console.deploy-runbook-controls.label" })} id={props.id} className="block min-w-0 w-full rounded-md border bg-surface p-3 text-sm">
      <span {...uiAttributes({ uid: "google-play-console.deploy-runbook-controls.span.3-6WG3Nt", id: "google-play-console.deploy-runbook-controls.span.3" })} className="flex items-start gap-2">
        <input {...uiAttributes({ uid: "google-play-console.deploy-runbook-controls.input-44qAeO", id: "google-play-console.deploy-runbook-controls.input" })}
          type="checkbox"
          className="mt-0.5 shrink-0"
          checked={props.checked}
          onChange={(event) => props.onChange(event.target.checked)}
        />
        <span {...uiAttributes({ uid: "google-play-console.deploy-runbook-controls.span.4-rOjP1E", id: "google-play-console.deploy-runbook-controls.span.4" })} className="min-w-0 font-medium break-words">{props.label}</span>
      </span>
      <span {...uiAttributes({ uid: "google-play-console.deploy-runbook-controls.span.5-mHP92M", id: "google-play-console.deploy-runbook-controls.span.5" })} className="mt-1 block text-xs text-on-surface-variant break-words">
        {props.help}
      </span>
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
    <label {...uiAttributes({ uid: "google-play-console.deploy-runbook-controls.label.2-7w1ODE", id: "google-play-console.deploy-runbook-controls.label.2" })} className="block space-y-2 text-sm">
      <span {...uiAttributes({ uid: "google-play-console.deploy-runbook-controls.span.6-7ZZGar", id: "google-play-console.deploy-runbook-controls.span.6" })} className="font-medium">{props.label}</span>
      <select {...uiAttributes({ uid: "google-play-console.deploy-runbook-controls.select-h3UdSs", id: "google-play-console.deploy-runbook-controls.select" })}
        className="block w-full min-w-0 max-w-full rounded-md border bg-background p-2 md:max-w-md"
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      >
        {props.scenarios.map(([value, label]) => (
          <option key={value} {...uiAttributes({ uid: "google-play-console.deploy-runbook-controls.option-2ANG8J", id: "google-play-console.deploy-runbook-controls.option" , instance: createOpaqueUiInstanceId("iter-c297eba839", String(value))})} value={value}>{label}</option>
        ))}
      </select>
      <span {...uiAttributes({ uid: "google-play-console.deploy-runbook-controls.span.7-163qEs", id: "google-play-console.deploy-runbook-controls.span.7" })} className="block text-xs text-on-surface-variant">
        يحدد السيناريو الأمر الأعلى، بينما تحدد checkboxes الفروع المفعّلة داخل الشجرة.
      </span>
    </label>
  );
}
