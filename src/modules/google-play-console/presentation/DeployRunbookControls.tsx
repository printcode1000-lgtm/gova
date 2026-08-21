"use client";

import * as React from "react";
import { CheckSquare, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { DeployRunbookBranch, DeployRunbookPhaseView } from "./DeployRunbookTypes";

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
}) {
  const toggle = (id: string) => {
    const next = new Set(props.selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    props.setSelected(next);
  };
  const allIds = props.runbook.flatMap((phase) => phase.sections.flatMap((section) => section.branches.map((item) => item.id)));
  const dangerousIds = props.runbook.flatMap((phase) => phase.sections.flatMap((section) => section.branches.filter((item) => item.dangerous).map((item) => item.id)));
  const safeIds = allIds.filter((id) => !dangerousIds.includes(id));
  return (
    <section className="space-y-4 rounded-md border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{props.title}</h2>
          <p className="text-sm text-on-surface-variant">{props.description}</p>
        </div>
        <ScenarioSelect label={props.scenarioLabel} value={props.scenarioValue} onChange={props.onScenarioChange} scenarios={props.scenarios} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => props.setSelected(new Set(allIds))}><CheckSquare className="h-4 w-4" />تفعيل الكل</Button>
        <Button variant="outline" onClick={() => props.setSelected(new Set())}><Square className="h-4 w-4" />تجاوز الكل</Button>
        <Button variant="outline" onClick={() => props.setSelected(new Set(safeIds))}>الفروع الآمنة فقط</Button>
        <Button variant="outline" onClick={() => props.setSelected(new Set(dangerousIds))}>الفروع الحساسة فقط</Button>
      </div>
      {props.extraOptions}
      <div className="space-y-4">
        {props.runbook.map((phase) => <PhaseBlock key={phase.id} phase={phase} selected={props.selected} help={props.help} onToggle={toggle} />)}
      </div>
    </section>
  );
}

export function Option(props: { checked: boolean; onChange: (value: boolean) => void; label: string; help: string }) {
  return (
    <label className="block rounded-md border bg-surface p-3 text-sm">
      <span className="flex items-center gap-2">
        <input type="checkbox" checked={props.checked} onChange={(event) => props.onChange(event.target.checked)} />
        <span className="font-medium">{props.label}</span>
      </span>
      <span className="mt-1 block text-xs text-on-surface-variant">{props.help}</span>
    </label>
  );
}

function ScenarioSelect(props: { label: string; value: string; onChange: (value: string) => void; scenarios: readonly (readonly [string, string])[] }) {
  return (
    <label className="space-y-1 text-sm">
      <span>{props.label}</span>
      <select className="block rounded-md border bg-background p-2" value={props.value} onChange={(event) => props.onChange(event.target.value)}>
        {props.scenarios.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <span className="block max-w-xs text-xs text-on-surface-variant">يحدد السيناريو الأمر الأعلى، بينما تحدد checkboxes الفروع المفعّلة داخل الشجرة.</span>
    </label>
  );
}

function PhaseBlock(props: { phase: DeployRunbookPhaseView; selected: Set<string>; help: Record<string, string>; onToggle: (id: string) => void }) {
  return (
    <section className="rounded-md border p-3">
      <h3 className="font-semibold">{props.phase.id} — {props.phase.label}</h3>
      <p className="mt-1 text-xs text-on-surface-variant">هذه مرحلة مستقلة في التسلسل؛ يمكن استئناف بعض الأوضاع منها عند فشل سابق.</p>
      <div className="mt-3 space-y-3">
        {props.phase.sections.map((section) => (
          <div key={section.id} className="rounded-md bg-muted/40 p-3">
            <h4 className="text-sm font-semibold">{section.id} — {section.label}</h4>
            <p className="mt-1 text-xs text-on-surface-variant">القسم يجمع فروعاً متقاربة، وكل فرع أدناه يمثل أمراً واحداً أو عملية واحدة.</p>
            <div className="mt-2 grid gap-2 lg:grid-cols-2">
              {section.branches.map((item) => <BranchCheckbox key={item.id} item={item} selected={props.selected.has(item.id)} help={props.help[item.id]} onToggle={props.onToggle} />)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function BranchCheckbox(props: { item: DeployRunbookBranch; selected: boolean; help?: string; onToggle: (id: string) => void }) {
  return (
    <label className="rounded-md border bg-surface p-3 text-sm">
      <span className="flex items-center gap-2">
        <input type="checkbox" checked={props.selected} onChange={() => props.onToggle(props.item.id)} />
        <span className="font-medium">{props.item.id}</span>
        {props.item.dangerous ? <span className="rounded-full bg-error-container px-2 py-0.5 text-xs text-on-error-container">حساس</span> : null}
      </span>
      <code className="mt-2 block text-xs" dir="ltr">{props.item.command}</code>
      <span className="mt-2 block text-xs text-on-surface-variant">{props.help ?? "فرع تنفيذي ضمن الشجرة؛ تفعيله يعني تضمينه في خطة التشغيل، وتجاوزه يعني عدم طلبه من هذا المسار."}</span>
    </label>
  );
}
