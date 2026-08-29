"use client";

import * as React from "react";
import { X } from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

import { Button } from "@/shared/ui/button";
import type { UiDescriptor } from "@asol/ui-registry-core";
import { uiAttributes } from "@asol/ui-registry-core";

const REMOVE_ENTRY_UI: UiDescriptor = { uid: "profile.contact.remove-entry-lh8Dtu", id: "profile.contact.remove-entry", kind: "item", interaction: { type: "tap" }, simulation: { kind: "list-item", id: "profile.contact.remove-entry" } };

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
  children,
}: {
  id?: string;
  color: string;
  icon: IconDefinition;
  title: string;
  removeLabel: string;
  /** Omitted in read-only surfaces, where nothing can be removed. */
  onRemove?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div {...uiAttributes({ uid: "profile.contact-info.contact-entry-card.div-MWY0r7", id: "profile.contact-info.contact-entry-card.div" })}
      id={id}
      className="space-y-2 rounded-lg border p-3"
      style={{ backgroundColor: `${color}10`, borderColor: `${color}44` }}
    >
      <div {...uiAttributes({ uid: "profile.contact-info.contact-entry-card.div.2-1NV0DS", id: "profile.contact-info.contact-entry-card.div.2" })} className="flex items-center justify-between gap-2">
        <span {...uiAttributes({ uid: "profile.contact-info.contact-entry-card.span-D1ArYX", id: "profile.contact-info.contact-entry-card.span" })}
          className="flex items-center gap-2 text-xs font-semibold"
          style={{ color }}
        >
          <FontAwesomeIcon icon={icon} className="h-3.5 w-3.5" />
          {title}
        </span>
        {onRemove ? (
          <Button
            ui={REMOVE_ENTRY_UI}
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="h-8 w-8 shrink-0 text-destructive"
            aria-label={removeLabel}
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
      {children}
    </div>
  );
}
