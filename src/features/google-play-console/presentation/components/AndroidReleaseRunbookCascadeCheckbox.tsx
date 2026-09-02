"use client";

import * as React from "react";

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
    <label id={props.id} className="block min-w-0 rounded-md border bg-surface p-3 text-sm">
      <span id="google-play-console-presentation-components-androidreleaserunbookcascadecheckbox-text-2-qpa4gc" className="flex items-start gap-2">
        <input id="google-play-console-presentation-components-androidreleaserunbookcascadecheckbox-input-3-wpsyyz"
          ref={inputRef}
          type="checkbox"
          className="mt-0.5 shrink-0"
          checked={props.checked}
          onChange={props.onChange}
        />
        <span id="google-play-console-presentation-components-androidreleaserunbookcascadecheckbox-text-4-giq6kc" className="min-w-0 font-medium break-words">{props.label}</span>
      </span>
      <span id="google-play-console-presentation-components-androidreleaserunbookcascadecheckbox-text-5-3hmozp" className="mt-1 block text-xs text-on-surface-variant break-words">{props.help}</span>
    </label>
  );
}
