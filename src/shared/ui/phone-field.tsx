"use client";

import * as React from "react";

import { cn } from "@/shared/utils";
import {
  composePhoneFieldValue,
  phoneCountryChoices,
  readNationalDigitsInput,
  readPhoneFieldValue,
  type PhoneFieldLabels,
} from "@/shared/phone/phone-field-model";
import {
  DEFAULT_PHONE_COUNTRY,
  phoneCountryCallingCode,
  type PhoneCountryCode,
} from "@asol/auth-core";
import type { UiDescriptor } from "@asol/ui-registry-core";

import { PhoneCountryDialog } from "./phone-country-dialog";
import { uiPrimitiveAttributes } from "./ui-primitive-attributes";

export type { PhoneFieldLabels };

export interface PhoneFieldProps {
  /** The canonical E.164 value, partial while the number is still being typed. */
  value: string;
  labels: PhoneFieldLabels;
  id?: string;
  ui?: UiDescriptor;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  inputClassName?: string;
  autoComplete?: string;
  placeholder?: string;
  onChange: (value: string) => void;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
}

/**
 * One international phone input for the whole application.
 *
 * The country and the national digits are edited separately but leave as a
 * single E.164 string, so every form, schema, and stored row keeps one spelling
 * of a number. Digits typed on an Arabic or Persian keyboard are folded to
 * ASCII on the way in, and a national trunk zero is dropped, because neither
 * belongs in the value a country calling code already prefixes.
 */
export function PhoneField({
  value,
  labels,
  id,
  ui,
  disabled = false,
  invalid = false,
  className,
  inputClassName,
  autoComplete = "tel",
  placeholder,
  onChange,
  onKeyDown,
}: PhoneFieldProps & { id?: string }) {
  const [isPickerOpen, setIsPickerOpen] = React.useState(false);
  const [preferredCountry, setPreferredCountry] =
    React.useState<PhoneCountryCode>(DEFAULT_PHONE_COUNTRY);

  const choices = React.useMemo(
    () => phoneCountryChoices(labels.locale),
    [labels.locale],
  );
  const parsed = readPhoneFieldValue(value, preferredCountry);
  const country = parsed.country;
  const callingCode = phoneCountryCallingCode(country);
  const selectedChoice = choices.find((choice) => choice.code === country);

  const handleCountrySelect = (next: PhoneCountryCode) => {
    setPreferredCountry(next);
    setIsPickerOpen(false);
    onChange(
      composePhoneFieldValue({
        country: next,
        nationalDigits: parsed.nationalDigits,
      }),
    );
  };

  return (
    <div id={id} className={cn("flex items-stretch gap-2", className)}>
      <button
        type="button"
        disabled={disabled}
        aria-label={labels.country}
        onClick={() => setIsPickerOpen(true)}
        className="asol-control inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-outline-variant bg-surface px-2.5 text-sm text-on-surface transition disabled:opacity-60"
      >
        <span aria-hidden="true" className="text-base leading-none">
          {selectedChoice?.flag ?? ""}
        </span>
        <span dir="ltr" className="text-xs font-semibold">
          +{callingCode}
        </span>
      </button>
      <input
        type="tel"
        inputMode="tel"
        dir="ltr"
        disabled={disabled}
        autoComplete={autoComplete}
        placeholder={placeholder ?? labels.placeholder}
        value={parsed.nationalDigits}
        onChange={(event) =>
          onChange(
            composePhoneFieldValue({
              country,
              nationalDigits: readNationalDigitsInput(event.target.value),
            }),
          )
        }
        onKeyDown={onKeyDown}
        className={cn(
          "asol-control asol-field-surface w-full flex-1 border border-input text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          invalid && "border-error",
          inputClassName,
        )}
        {...uiPrimitiveAttributes("input", ui, disabled ? "disabled" : undefined)}
      />
      <PhoneCountryDialog
        open={isPickerOpen}
        choices={choices}
        selected={country}
        title={labels.country}
        searchPlaceholder={labels.countrySearch}
        emptyLabel={labels.countryEmpty}
        onSelect={handleCountrySelect}
        onOpenChange={setIsPickerOpen}
      />
    </div>
  );
}
