"use client";

import * as React from "react";

import { Button } from "@/shared/ui/button";
import { RunbookPanel, Option } from "./DeployRunbookControls";
import { DEPLOY_ALL_RUNBOOK } from "@asol/release-core/console";
import type { DeployTab } from "./DeployRunbookTypes";
import { ALL_BRANCH_HELP, deployAllScenarios } from "./deploy-runbook-copy";

export function Header({ id }: { id?: string }) {
  return (
    <header id={id} className="space-y-2 rounded-md border bg-surface p-3 sm:p-4">
      <h1 className="text-xl font-semibold sm:text-2xl">مركز تشغيل Deploy</h1>
      <p className="text-sm text-on-surface-variant">
        تنفيذ الأوامر يتم كعملية نظام مستقلة من خلال Job محلي، والصفحة تعرض الطرفية وتتحكم في التسلسل فقط.
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
  const tone = running
    ? "bg-primary-container text-on-primary-container"
    : "bg-muted text-on-surface-variant";
  return (
    <span id={props.id} className={`rounded-full px-2 py-0.5 text-xs ${tone}`}>
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
    <section id={props.id} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <InfoCard
        title="الفروع المفعّلة"
        value={`${props.selectedCount} / ${props.totalCount}`}
        help="كل checkbox يحدد هل يدخل هذا الفرع ضمن خطة التشغيل الحالية أم يتم تجاوزه."
      />
      <InfoCard
        title="حالة التنفيذ"
        value={props.status}
        help="العملية تستمر كـ job محلي حتى لو أغلقت الصفحة."
      />
      <InfoCard
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
            checked={props.continueOnError}
            onChange={props.setContinueOnError}
            label="الاستمرار بعد الخطأ"
            help={
              "عند التفعيل يحاول الانتقال للمرحلة التالية بعد تسجيل الخطأ. " +
              "الافتراضي أكثر أماناً: التوقف عند أول فشل."
            }
          />
          <Option
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
} & { id?: string }) {
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
