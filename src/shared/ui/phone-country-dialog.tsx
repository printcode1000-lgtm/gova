"use client";

import * as React from "react";
import { Search } from "lucide-react";

import {
  filterPhoneCountries,
  type PhoneCountryChoice,
} from "@/shared/phone/phone-field-model";
import type { PhoneCountryCode } from "@asol/auth-core";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./dialog";
import { uiAttributes } from "@asol/ui-registry-core";

interface PhoneCountryDialogProps {
  id?: string;
  open: boolean;
  choices: readonly PhoneCountryChoice[];
  selected: PhoneCountryCode;
  title: string;
  searchPlaceholder: string;
  emptyLabel: string;
  onSelect: (country: PhoneCountryCode) => void;
  onOpenChange: (open: boolean) => void;
}

/** The country list behind a phone field: every country, searchable. */
export function PhoneCountryDialog({
  id,
  open,
  choices,
  selected,
  title,
  searchPlaceholder,
  emptyLabel,
  onSelect,
  onOpenChange,
}: PhoneCountryDialogProps & { id?: string }) {
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    if (open) setSearch("");
  }, [open]);

  const visible = React.useMemo(
    () => filterPhoneCountries(choices, search),
    [choices, search],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent ui={{ uid: "shared.phone-country-dialog.content-lQy7vN", id: "shared.phone-country-dialog.content" }} id={id} className="max-h-[80vh] max-w-md overflow-hidden p-0">
        <DialogHeader ui={{ uid: "shared.phone-country-dialog.dialog-header-1M633G", id: "shared.phone-country-dialog.dialog-header" }} className="border-b border-outline-variant p-4">
          <DialogTitle ui={{ uid: "shared.phone-country-dialog.dialog-title-VD4TMR", id: "shared.phone-country-dialog.dialog-title" }} className="text-base font-semibold">{title}</DialogTitle>
        </DialogHeader>
        <div {...uiAttributes({ uid: "shared.phone-country-dialog.div-1LZJip", id: "shared.phone-country-dialog.div" })} className="p-3">
          <div {...uiAttributes({ uid: "shared.phone-country-dialog.div.2-obTBi2", id: "shared.phone-country-dialog.div.2" })} className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
            <input {...uiAttributes({ uid: "shared.phone-country-dialog.input-SZ90w7", id: "shared.phone-country-dialog.input" })}
              type="search"
              inputMode="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="asol-control asol-field-surface w-full border border-outline-variant ps-9 text-sm"
            />
          </div>
        </div>
        <div {...uiAttributes({ uid: "shared.phone-country-dialog.div.3-pH1R34", id: "shared.phone-country-dialog.div.3" })} className="max-h-[55vh] overflow-y-auto overscroll-y-contain px-3 pb-3">
          {visible.length === 0 ? (
            <p {...uiAttributes({ uid: "shared.phone-country-dialog.p-T2GMzw", id: "shared.phone-country-dialog.p" })} className="px-2 py-6 text-center text-sm text-on-surface-variant">
              {emptyLabel}
            </p>
          ) : (
            <ul {...uiAttributes({ uid: "shared.phone-country-dialog.ul-5G1LWA", id: "shared.phone-country-dialog.ul" })} className="space-y-1">
              {visible.map((choice) => (
                <li key={choice.code} {...uiAttributes({ uid: "shared.phone-country-dialog.li-hBGkJ9", id: "shared.phone-country-dialog.li" })}>
                  <button {...uiAttributes({ uid: "shared.phone-country-dialog.button-jSL3TK", id: "shared.phone-country-dialog.button" })}
                    type="button"
                    aria-pressed={choice.code === selected}
                    onClick={() => onSelect(choice.code)}
                    className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-start text-sm transition ${
                      choice.code === selected
                        ? "border-primary bg-primary/10 text-on-surface"
                        : "border-transparent bg-surface-container-low text-on-surface"
                    }`}
                  >
                    <span {...uiAttributes({ uid: "shared.phone-country-dialog.span-Lr9KS0", id: "shared.phone-country-dialog.span" })} aria-hidden="true" className="text-lg leading-none">
                      {choice.flag}
                    </span>
                    <span {...uiAttributes({ uid: "shared.phone-country-dialog.span.2-n5dC9T", id: "shared.phone-country-dialog.span.2" })} className="flex-1">{choice.name}</span>
                    <span {...uiAttributes({ uid: "shared.phone-country-dialog.span.3-XWbWZ6", id: "shared.phone-country-dialog.span.3" })} dir="ltr" className="text-xs text-on-surface-variant">
                      +{choice.callingCode}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
