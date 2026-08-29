"use client";

import * as React from "react";
import { uiAttributes } from "@asol/ui-registry-core";

export function CascadeCheckbox(props: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  label: React.ReactNode;
  help: string;
} & { id?: string }) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = Boolean(props.indeterminate);
  }, [props.indeterminate]);

  return (
    <label {...uiAttributes({ uid: "google-play-console.android-release-runbook-cascade-checkbox.label-7viCE4", id: "google-play-console.android-release-runbook-cascade-checkbox.label" })} id={props.id} className="block min-w-0 rounded-md border bg-surface p-3 text-sm">
      <span {...uiAttributes({ uid: "google-play-console.android-release-runbook-cascade-checkbox.span-aN7N5k", id: "google-play-console.android-release-runbook-cascade-checkbox.span" })} className="flex items-start gap-2">
        <input {...uiAttributes({ uid: "google-play-console.android-release-runbook-cascade-checkbox.input-Z0yK7r", id: "google-play-console.android-release-runbook-cascade-checkbox.input" })}
          ref={inputRef}
          type="checkbox"
          className="mt-0.5 shrink-0"
          checked={props.checked}
          onChange={props.onChange}
        />
        <span {...uiAttributes({ uid: "google-play-console.android-release-runbook-cascade-checkbox.span.2-662JGA", id: "google-play-console.android-release-runbook-cascade-checkbox.span.2" })} className="min-w-0 font-medium break-words">{props.label}</span>
      </span>
      <span {...uiAttributes({ uid: "google-play-console.android-release-runbook-cascade-checkbox.span.3-4F6RG7", id: "google-play-console.android-release-runbook-cascade-checkbox.span.3" })} className="mt-1 block text-xs text-on-surface-variant break-words">{props.help}</span>
    </label>
  );
}
