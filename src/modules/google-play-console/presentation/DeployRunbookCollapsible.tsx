"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

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
}) {
  return (
    <details
      className={cn(
        "group w-full min-w-0 max-w-full rounded-md border bg-surface",
        props.nested && "border-dashed bg-muted/20",
        props.className,
      )}
    >
      <summary
        className={SUMMARY_CLASS}
        onClick={(event) => {
          const target = event.target as HTMLElement;
          if (target.closest("button, a, input, select, textarea, label")) {
            event.preventDefault();
          }
        }}
      >
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
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
            <p className="text-xs text-on-surface-variant break-words">
              {props.description}
            </p>
          ) : null}
        </div>
        <div className="flex w-full shrink-0 items-center justify-between gap-2 sm:w-auto sm:justify-end">
          {props.actions ? (
            <div className="flex flex-wrap items-center gap-2">{props.actions}</div>
          ) : null}
          <ChevronDown
            className="h-4 w-4 shrink-0 text-on-surface-variant transition-transform group-open:rotate-180"
          />
        </div>
      </summary>
      <div className={cn(CONTENT_CLASS, props.contentClassName)}>{props.children}</div>
    </details>
  );
}
