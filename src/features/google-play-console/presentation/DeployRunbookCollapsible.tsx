"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/shared/utils";
import { uiAttributes, type UiInstanceId } from "@asol/ui-registry-core";

const SUMMARY_CLASS =
  "flex list-none flex-col gap-2 p-3 active:bg-muted/40 sm:flex-row " +
  "sm:items-start sm:justify-between sm:gap-3 sm:p-4 " +
  "[&::-webkit-details-marker]:hidden";

const CONTENT_CLASS =
  "w-full min-w-0 max-w-full border-t p-3 pt-3 sm:p-4 " +
  "[&_input]:max-w-full [&_select]:max-w-full [&_textarea]:max-w-full";

export function DeployRunbookCollapsible(props: {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  nested?: boolean;
  instance?: UiInstanceId;
} & { id?: string }) {
  return (
    <details {...uiAttributes({ uid: "google-play-console.deploy-runbook-collapsible.details-Od3AKX", id: "google-play-console.deploy-runbook-collapsible.details", instance: props.instance })} id={props.id}
      className={cn(
        "group w-full min-w-0 max-w-full rounded-md border bg-surface",
        props.nested && "border-dashed bg-muted/20",
        props.className,
      )}
    >
      <summary {...uiAttributes({ uid: "google-play-console.deploy-runbook-collapsible.summary-ncUDM6", id: "google-play-console.deploy-runbook-collapsible.summary", instance: props.instance })}
        className={SUMMARY_CLASS}
        onClick={(event) => {
          const target = event.target as HTMLElement;
          if (target.closest("button, a, input, select, textarea, label")) {
            event.preventDefault();
          }
        }}
      >
        <div {...uiAttributes({ uid: "google-play-console.deploy-runbook-collapsible.div-0XT0qf", id: "google-play-console.deploy-runbook-collapsible.div", instance: props.instance })} className="min-w-0 flex-1 space-y-1">
          <div {...uiAttributes({ uid: "google-play-console.deploy-runbook-collapsible.div.2-Kk8mC9", id: "google-play-console.deploy-runbook-collapsible.div.2", instance: props.instance })} className="flex flex-wrap items-center gap-2">
            <span {...uiAttributes({ uid: "google-play-console.deploy-runbook-collapsible.span-zA4CXJ", id: "google-play-console.deploy-runbook-collapsible.span", instance: props.instance })}
              className={cn(
                "font-semibold break-words",
                props.nested ? "text-sm" : "text-base",
              )}
            >
              {props.title}
            </span>
            {props.badge}
          </div>
          {props.description ? (
            <p {...uiAttributes({ uid: "google-play-console.deploy-runbook-collapsible.p-zxxiP7", id: "google-play-console.deploy-runbook-collapsible.p", instance: props.instance })} className="text-xs text-on-surface-variant break-words">
              {props.description}
            </p>
          ) : null}
        </div>
        <div {...uiAttributes({ uid: "google-play-console.deploy-runbook-collapsible.div.3-PIs50J", id: "google-play-console.deploy-runbook-collapsible.div.3", instance: props.instance })} className="flex w-full shrink-0 items-center justify-between gap-2 sm:w-auto sm:justify-end">
          {props.actions ? (
            <div {...uiAttributes({ uid: "google-play-console.deploy-runbook-collapsible.div.4-S49DF9", id: "google-play-console.deploy-runbook-collapsible.div.4", instance: props.instance })} className="flex flex-wrap items-center gap-2">{props.actions}</div>
          ) : null}
          <ChevronDown
            className="h-4 w-4 shrink-0 text-on-surface-variant transition-transform group-open:rotate-180"
          />
        </div>
      </summary>
      <div {...uiAttributes({ uid: "google-play-console.deploy-runbook-collapsible.div.5-0SM7sn", id: "google-play-console.deploy-runbook-collapsible.div.5", instance: props.instance })} className={cn(CONTENT_CLASS, props.contentClassName)}>{props.children}</div>
    </details>
  );
}
