"use client";

import * as React from "react";

import { Button } from "@/shared/ui/button";
import { RunbookPanel, Option } from "./DeployRunbookControls";
import { DEPLOY_ALL_RUNBOOK } from "@asol/release-core/console";
import type { DeployTab } from "./DeployRunbookTypes";
import { ALL_BRANCH_HELP, deployAllScenarios } from "./deploy-runbook-copy";
import { createUiInstanceId, uiAttributes, type UiInstanceId } from "@asol/ui-registry-core";

export function Header({ id }: { id?: string }) {
  return (
    <header {...uiAttributes({ uid: "google-play-console.deploy-runbook-page-sections.header-ggY0za", id: "google-play-console.deploy-runbook-page-sections.header" })} id={id} className="space-y-2 rounded-md border bg-surface p-3 sm:p-4">
      <h1 {...uiAttributes({ uid: "google-play-console.deploy-runbook-page-sections.h1-p9E7ZV", id: "google-play-console.deploy-runbook-page-sections.h1" })} className="text-xl font-semibold sm:text-2xl">مركز تشغيل Deploy</h1>
      <p {...uiAttributes({ uid: "google-play-console.deploy-runbook-page-sections.p-8vS3uL", id: "google-play-console.deploy-runbook-page-sections.p" })} className="text-sm text-on-surface-variant">
        تنفيذ الأوامر يتم كعملية نظام مستقلة من خلال Job محلي، والصفحة تعرض الطرفية وتتحكم في التسلسل فقط.
      </p>
    </header>
  );
}

export function TabButtons(props: { tab: DeployTab; setTab: (tab: DeployTab) => void } & { id?: string }) {
  return (
    <div {...uiAttributes({ uid: "google-play-console.deploy-runbook-page-sections.div-mg8stF", id: "google-play-console.deploy-runbook-page-sections.div" })} id={props.id} className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
      <Button
        ui={{
          uid: "deploy-runbook.tab-deploy-all-J49BXV",
          id: "deploy-runbook.tab-deploy-all",
          kind: "action",
          action: "select-deploy-all-tab",
          part: "tabs",
        }}
        className="w-full sm:w-auto"
        variant={props.tab === "deploy-all" ? "default" : "outline"}
        onClick={() => props.setTab("deploy-all")}
      >
        Deploy All
      </Button>
      <Button
        ui={{
          uid: "deploy-runbook.tab-deploy-push-mI1N1Q",
          id: "deploy-runbook.tab-deploy-push",
          kind: "action",
          action: "select-deploy-push-tab",
          part: "tabs",
        }}
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
  const tone = running
    ? "bg-primary-container text-on-primary-container"
    : "bg-muted text-on-surface-variant";
  return (
    <span {...uiAttributes({ uid: "google-play-console.deploy-runbook-page-sections.span-kq3I3P", id: "google-play-console.deploy-runbook-page-sections.span" })} id={props.id} className={`rounded-full px-2 py-0.5 text-xs ${tone}`}>
      {props.status}
    </span>
  );
}

export function Summary(props: {
  selectedCount: number;
  totalCount: number;
  status: string;
  continueOnError: boolean;
} & { id?: string }) {
  return (
    <section {...uiAttributes({ uid: "google-play-console.deploy-runbook-page-sections.section-tt8Wiv", id: "google-play-console.deploy-runbook-page-sections.section" })} id={props.id} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <InfoCard
        instance={createUiInstanceId("active-branches")}
        title="الفروع المفعّلة"
        value={`${props.selectedCount} / ${props.totalCount}`}
        help="كل checkbox يحدد هل يدخل هذا الفرع ضمن خطة التشغيل الحالية أم يتم تجاوزه."
      />
      <InfoCard
        instance={createUiInstanceId("execution-status")}
        title="حالة التنفيذ"
        value={props.status}
        help="العملية تستمر كـ job محلي حتى لو أغلقت الصفحة."
      />
      <InfoCard
        instance={createUiInstanceId("error-behavior")}
        title="سلوك الخطأ"
        value={props.continueOnError ? "استمرار" : "توقف"}
        help="الافتراضي يوقف التسلسل عند أول خطأ لحماية النشر من نتائج نصف مكتملة."
        className="sm:col-span-2 lg:col-span-1"
      />
    </section>
  );
}

export function DeployAllPanel(props: {
  selected: Set<string>;
  setSelected: (next: Set<string>) => void;
  scenario: string;
  setScenario: (value: string) => void;
  continueOnError: boolean;
  setContinueOnError: (value: boolean) => void;
  skipPreflight: boolean;
  setSkipPreflight: (value: boolean) => void;
} & { id?: string }) {
  return (
    <RunbookPanel id={props.id}
      instance={createUiInstanceId("deploy-all")}
      title="Deploy All"
      description="المسار الكامل: فحوصات، بناء، قواعد بيانات، خدمات، GitHub، ثم تحقق Vercel."
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
            instance={createUiInstanceId("continue-on-error")}
            checked={props.continueOnError}
            onChange={props.setContinueOnError}
            label="الاستمرار بعد الخطأ"
            help={
              "عند التفعيل يحاول الانتقال للمرحلة التالية بعد تسجيل الخطأ. " +
              "الافتراضي أكثر أماناً: التوقف عند أول فشل."
            }
          />
          <Option
            instance={createUiInstanceId("skip-preflight")}
            checked={props.skipPreflight}
            onChange={props.setSkipPreflight}
            label="تجاوز preflight"
            help={
              "يسمح بتشغيل publish دون انتظار الفحوصات الطويلة. " +
              "يظهر هذا في commit حتى لا يختفي الاختصار."
            }
          />
        </>
      }
    />
  );
}

function InfoCard(props: {
  title: string;
  value: string;
  help: string;
  className?: string;
  instance: UiInstanceId;
} & { id?: string }) {
  return (
    <div {...uiAttributes({ uid: "google-play-console.deploy-runbook-page-sections.div.2-uX76m0", id: "google-play-console.deploy-runbook-page-sections.div.2", instance: props.instance })} id={props.id} className={props.className ?? ""}>
      <div {...uiAttributes({ uid: "google-play-console.deploy-runbook-page-sections.div.3-M6vdGi", id: "google-play-console.deploy-runbook-page-sections.div.3", instance: props.instance })} className="min-w-0 rounded-md border bg-surface p-3">
        <div {...uiAttributes({ uid: "google-play-console.deploy-runbook-page-sections.div.4-3Gbi1U", id: "google-play-console.deploy-runbook-page-sections.div.4", instance: props.instance })} className="text-xs text-on-surface-variant">{props.title}</div>
        <div {...uiAttributes({ uid: "google-play-console.deploy-runbook-page-sections.div.5-hZ0JDj", id: "google-play-console.deploy-runbook-page-sections.div.5", instance: props.instance })} className="mt-1 text-lg font-semibold break-words">{props.value}</div>
        <p {...uiAttributes({ uid: "google-play-console.deploy-runbook-page-sections.p.2-tlONG2", id: "google-play-console.deploy-runbook-page-sections.p.2", instance: props.instance })} className="mt-1 text-xs text-on-surface-variant break-words">{props.help}</p>
      </div>
    </div>
  );
}
