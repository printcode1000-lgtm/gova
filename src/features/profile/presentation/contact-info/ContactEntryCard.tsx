"use client";

import * as React from "react";
import { X } from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

/**
 * One contact entry: a phone number, an address, a link.
 *
 * The delete control heads the card rather than sharing the row with the
 * field, so a thumb reaching for the input cannot land on it, and the card
 * keeps its full width for the value being typed.
 */
export function ContactEntryCard({
  id,
  color,
  icon,
  title,
  removeLabel,
  onRemove,
  embedded = false,
  children,
}: {
  id?: string;
  color: string;
  icon: IconDefinition;
  title: string;
  removeLabel: string;
  /** Omitted in read-only surfaces, where nothing can be removed. */
  onRemove?: () => void;
  /** When true, the surrounding kind popover owns the only visible container. */
  embedded?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      id={id}
      className={embedded ? "space-y-[6px] p-[6px]" : "space-y-[6px] rounded-xl border p-[6px]"}
      style={embedded ? undefined : { backgroundColor: `${color}10`, borderColor: `${color}44` }}
    >
      <div className="flex h-6 items-center justify-between gap-[6px] px-[6px] py-0">
        <span
          className="flex min-w-0 flex-1 items-center gap-[6px] text-xs font-semibold leading-[1.35]"
          style={{ color }}
        >
          <FontAwesomeIcon icon={icon} className="h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 flex-1 truncate align-middle" aria-label={title}>
            {title}
          </span>
        </span>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-red-600 bg-transparent p-0 text-red-600 active:text-red-700"
            aria-label={removeLabel}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
      {children}
    </div>
  );
}
