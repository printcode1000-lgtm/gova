"use client";

import * as React from "react";
import { Search } from "lucide-react";

import {
  filterPhoneCountries,
  type PhoneCountryChoice,
} from "@/shared/phone/phone-field-model";
import type { PhoneCountryCode } from "@asol/auth-core";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./dialog";

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
      <DialogContent
        id={id ? `${id}-dialog-content-e0cbfd` : undefined}
        className="max-h-[80vh] max-w-md overflow-hidden p-0"
      >
        <DialogHeader id={id ? `${id}-dialog-header-a7542c` : undefined}
          className="border-b border-outline-variant p-4"
        >
          <DialogTitle
            className="text-base font-semibold"
          >
            {title}
          </DialogTitle>
        </DialogHeader>
        <div id={id ? `${id}-div-2-imozkx` : undefined}
          className="p-3"
        >
          <div id={id ? `${id}-div-3-qfnxek` : undefined}
            className="relative"
          >
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
            <input id={id ? `${id}-input-4-chyyhj` : undefined}
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
        <div id={id ? `${id}-div-5-ozxzhg` : undefined}
          className="max-h-[55vh] overflow-y-auto overscroll-y-contain px-3 pb-3"
        >
          {visible.length === 0 ? (
            <p id={id ? `${id}-text-6-8dfum4` : undefined}
              className="px-2 py-6 text-center text-sm text-on-surface-variant"
            >
              {emptyLabel}
            </p>
          ) : (
            <ul id={id ? `${id}-ul-7-as9vlv` : undefined}
              className="space-y-1"
            >
              {visible.map((choice) => (
                <li
                  key={choice.code}
                >
                  <button
                    type="button"
                    aria-pressed={choice.code === selected}
                    onClick={() => onSelect(choice.code)}
                    className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-start text-sm transition ${
                      choice.code === selected
                        ? "border-primary bg-primary/10 text-on-surface"
                        : "border-transparent bg-surface-container-low text-on-surface"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className="text-lg leading-none"
                    >
                      {choice.flag}
                    </span>
                    <span
                      className="flex-1"
                    >
                      {choice.name}
                    </span>
                    <span
                      dir="ltr"
                      className="text-xs text-on-surface-variant"
                    >
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
