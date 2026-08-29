"use client";

import * as React from "react";

import type { DeployRunbookBranch, DeployRunbookPhaseView } from "./DeployRunbookTypes";
import { DeployRunbookCollapsible } from "./DeployRunbookCollapsible";
import { uiAttributes } from "@asol/ui-registry-core";

export function PhaseBlock(props: {
  phase: DeployRunbookPhaseView;
  selected: Set<string>;
  help: Record<string, string>;
  onToggle: (id: string) => void;
} & { id?: string }) {
  const branchIds = props.phase.sections.flatMap((section) =>
    section.branches.map((item) => item.id),
  );
  const activeCount = branchIds.filter((id) => props.selected.has(id)).length;

  return (
    <DeployRunbookCollapsible id={props.id}
      nested
      title={`${props.phase.id} — ${props.phase.label}`}
      description="مرحلة مستقلة في التسلسل؛ بعض الأوضاع تستأنف منها بعد فشل سابق."
      badge={
        <span {...uiAttributes({ uid: "google-play-console.deploy-runbook-phase-tree.span-8zd6X9", id: "google-play-console.deploy-runbook-phase-tree.span" })} className="rounded-full bg-muted px-2 py-0.5 text-xs text-on-surface-variant">
          {activeCount} / {branchIds.length}
        </span>
      }
    >
      <div {...uiAttributes({ uid: "google-play-console.deploy-runbook-phase-tree.div-D4Q14H", id: "google-play-console.deploy-runbook-phase-tree.div" })} className="space-y-3">
        {props.phase.sections.map((section) => (
          <SectionBlock
            key={section.id}
            section={section}
            selected={props.selected}
            help={props.help}
            onToggle={props.onToggle}
          />
        ))}
      </div>
    </DeployRunbookCollapsible>
  );
}

function SectionBlock(props: {
  section: DeployRunbookPhaseView["sections"][number];
  selected: Set<string>;
  help: Record<string, string>;
  onToggle: (id: string) => void;
} & { id?: string }) {
  const activeCount = props.section.branches.filter((item) =>
    props.selected.has(item.id),
  ).length;

  return (
    <DeployRunbookCollapsible id={props.id}
      nested
      title={`${props.section.id} — ${props.section.label}`}
      description="قسم يجمع فروعاً متقاربة؛ كل فرع يمثل أمراً أو عملية واحدة."
      badge={
        <span {...uiAttributes({ uid: "google-play-console.deploy-runbook-phase-tree.span.2-CF97Sf", id: "google-play-console.deploy-runbook-phase-tree.span.2" })} className="rounded-full bg-muted px-2 py-0.5 text-xs text-on-surface-variant">
          {activeCount} / {props.section.branches.length}
        </span>
      }
    >
      <div {...uiAttributes({ uid: "google-play-console.deploy-runbook-phase-tree.div.2-EwwOL6", id: "google-play-console.deploy-runbook-phase-tree.div.2" })} className="grid grid-cols-1 gap-2 sm:grid-cols-2 2xl:grid-cols-3">
        {props.section.branches.map((item) => (
          <BranchCheckbox
            key={item.id}
            item={item}
            selected={props.selected.has(item.id)}
            help={props.help[item.id]}
            onToggle={props.onToggle}
          />
        ))}
      </div>
    </DeployRunbookCollapsible>
  );
}

function BranchCheckbox(props: {
  item: DeployRunbookBranch;
  selected: boolean;
  help?: string;
  onToggle: (id: string) => void;
} & { id?: string }) {
  const defaultHelp =
    "فرع تنفيذي ضمن الشجرة؛ تفعيله يعني تضمينه في خطة التشغيل، وتجاوزه يعني عدم طلبه من هذا المسار.";

  return (
    <label {...uiAttributes({ uid: "google-play-console.deploy-runbook-phase-tree.label-MDBW7h", id: "google-play-console.deploy-runbook-phase-tree.label" })} id={props.id} className="min-w-0 w-full rounded-md border bg-surface p-3 text-sm">
      <span {...uiAttributes({ uid: "google-play-console.deploy-runbook-phase-tree.span.3-TZb4XZ", id: "google-play-console.deploy-runbook-phase-tree.span.3" })} className="flex flex-wrap items-start gap-2">
        <input {...uiAttributes({ uid: "google-play-console.deploy-runbook-phase-tree.input-zA98Et", id: "google-play-console.deploy-runbook-phase-tree.input" })}
          type="checkbox"
          className="mt-0.5 shrink-0"
          checked={props.selected}
          onChange={() => props.onToggle(props.item.id)}
        />
        <span {...uiAttributes({ uid: "google-play-console.deploy-runbook-phase-tree.span.4-4GTTFQ", id: "google-play-console.deploy-runbook-phase-tree.span.4" })} className="min-w-0 font-medium break-words">{props.item.id}</span>
        {props.item.dangerous ? (
          <span {...uiAttributes({ uid: "google-play-console.deploy-runbook-phase-tree.span.5-id5aqC", id: "google-play-console.deploy-runbook-phase-tree.span.5" })} className="shrink-0 rounded-full bg-error-container px-2 py-0.5 text-xs text-on-error-container">
            حساس
          </span>
        ) : null}
      </span>
      <code {...uiAttributes({ uid: "google-play-console.deploy-runbook-phase-tree.code-sM5PVJ", id: "google-play-console.deploy-runbook-phase-tree.code" })}
        className="mt-2 block w-full min-w-0 overflow-x-auto whitespace-pre-wrap break-all text-xs"
        dir="ltr"
      >
        {props.item.command}
      </code>
      <span {...uiAttributes({ uid: "google-play-console.deploy-runbook-phase-tree.span.6-IL6NE0", id: "google-play-console.deploy-runbook-phase-tree.span.6" })} className="mt-2 block text-xs text-on-surface-variant break-words">
        {props.help ?? defaultHelp}
      </span>
    </label>
  );
}

export function branchIdsFromRunbook(runbook: readonly DeployRunbookPhaseView[]): string[] {
  return runbook.flatMap((phase) =>
    phase.sections.flatMap((section) => section.branches.map((item) => item.id)),
  );
}

export function dangerousBranchIds(runbook: readonly DeployRunbookPhaseView[]): string[] {
  return runbook.flatMap((phase) =>
    phase.sections.flatMap((section) =>
      section.branches.filter((item) => item.dangerous).map((item) => item.id),
    ),
  );
}
