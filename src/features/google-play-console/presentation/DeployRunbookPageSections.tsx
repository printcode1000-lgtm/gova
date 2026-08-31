"use client";

import * as React from "react";

import { Button } from "@/shared/ui/button";
import { RunbookPanel, Option } from "./DeployRunbookControls";
import { DEPLOY_ALL_RUNBOOK } from "@asol/release-core/console";
import type { DeployTab } from "./DeployRunbookTypes";
import { ALL_BRANCH_HELP, deployAllScenarios } from "./deploy-runbook-copy";

import {
  BRANCH_CHECKBOX_HELP,
  CONTINUE_ON_ERROR_DETAIL,
  CONTINUE_ON_ERROR_HELP,
  DEPLOY_ALL_DESCRIPTION,
  EXECUTION_STATE_HELP,
  EXECUTION_STATE_TITLE,
  PAGE_INTRO,
  SKIP_PREFLIGHT_HELP,
} from "./deploy-runbook-labels";

export function Header({ id }: { id?: string }) {
  return (
    <header id={id} className="space-y-2 rounded-md border bg-surface p-3 sm:p-4">
      <h1 className="text-xl font-semibold sm:text-2xl">مركز تشغيل Deploy</h1>
      <p className="text-sm text-on-surface-variant">
        {PAGE_INTRO}
      </p>
    </header>
  );
}

export function TabButtons(props: { tab: DeployTab; setTab: (tab: DeployTab) => void } & { id?: string }) {
  return (
    <div id={props.id} className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
      <Button
        className="w-full sm:w-auto"
        variant={props.tab === "deploy-all" ? "default" : "outline"}
        onClick={() => props.setTab("deploy-all")}
      >
        Deploy All
      </Button>
      <Button
        className="w-full sm:w-auto"
        variant={props.tab === "deploy-push" ? "default" : "outline"}
        onClick={() => props.setTab("deploy-push")}
      >
        Deploy Push
      </Button>
    </div>
  );
}

export function StatusBadge(props: { status: string } & { id?: string }) {
  const running = props.status === "running" || props.status === "queued";
  const tone = running ? "bg-primary-container text-on-primary-container" : "bg-muted text-on-surface-variant";
  return (
    <span id={props.id} className={`rounded-full px-2 py-0.5 text-xs ${tone}`}>
      {props.status}
    </span>
  );
}

export function Summary(
  props: {
    selectedCount: number;
    totalCount: number;
    status: string;
    continueOnError: boolean;
  } & { id?: string },
) {
  return (
    <section id={props.id} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <InfoCard
        title="الفروع المفعّلة"
        value={`${props.selectedCount} / ${props.totalCount}`}
        help={BRANCH_CHECKBOX_HELP}
      />
      <InfoCard
        title={EXECUTION_STATE_TITLE}
        value={props.status}
        help={EXECUTION_STATE_HELP}
      />
      <InfoCard
        title="سلوك الخطأ"
        value={props.continueOnError ? "استمرار" : "توقف"}
        help={CONTINUE_ON_ERROR_HELP}
        className="sm:col-span-2 lg:col-span-1"
      />
    </section>
  );
}

export function DeployAllPanel(
  props: {
    selected: Set<string>;
    setSelected: (next: Set<string>) => void;
    scenario: string;
    setScenario: (value: string) => void;
    continueOnError: boolean;
    setContinueOnError: (value: boolean) => void;
    skipPreflight: boolean;
    setSkipPreflight: (value: boolean) => void;
  } & { id?: string },
) {
  return (
    <RunbookPanel
      id={props.id}
      title="Deploy All"
      description={DEPLOY_ALL_DESCRIPTION}
      runbook={DEPLOY_ALL_RUNBOOK}
      help={ALL_BRANCH_HELP}
      selected={props.selected}
      setSelected={props.setSelected}
      scenarioLabel="وضع التشغيل"
      scenarioValue={props.scenario}
      onScenarioChange={props.setScenario}
      scenarios={deployAllScenarios}
      extraOptions={
        <>
          <Option
            checked={props.continueOnError}
            onChange={props.setContinueOnError}
            label="الاستمرار بعد الخطأ"
            help={
              CONTINUE_ON_ERROR_DETAIL +
              "الافتراضي أكثر أماناً: التوقف عند أول فشل."
            }
          />
          <Option
            checked={props.skipPreflight}
            onChange={props.setSkipPreflight}
            label="تجاوز preflight"
            help={SKIP_PREFLIGHT_HELP}
          />
        </>
      }
    />
  );
}

function InfoCard(
  props: {
    title: string;
    value: string;
    help: string;
    className?: string;
  } & { id?: string },
) {
  return (
    <div id={props.id} className={props.className ?? ""}>
      <div className="min-w-0 rounded-md border bg-surface p-3">
        <div className="text-xs text-on-surface-variant">{props.title}</div>
        <div className="mt-1 text-lg font-semibold break-words">{props.value}</div>
        <p className="mt-1 text-xs text-on-surface-variant break-words">{props.help}</p>
      </div>
    </div>
  );
}
