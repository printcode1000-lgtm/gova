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
  phoneExampleNationalNumber,
  type PhoneCountryCode,
} from "@asol/auth-core";

import { PhoneCountryDialog } from "./phone-country-dialog";

export type { PhoneFieldLabels };

export interface PhoneFieldProps {
  /** The canonical E.164 value, partial while the number is still being typed. */
  value: string;
  labels: PhoneFieldLabels;
  id?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  inputClassName?: string;
  autoComplete?: string;
  onChange: (value: string) => void;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
}

/**
 * One international phone input for the whole application.
 *
 * The caller-owned descriptor scopes every fixed internal subpart. When the
 * field itself repeats, the caller must provide ui.instance from stable domain
 * identity; every internal part then inherits that runtime scope.
 */
export function PhoneField({
  value,
  labels,
  id,
  disabled = false,
  invalid = false,
  className,
  inputClassName,
  autoComplete = "tel",
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
  const placeholder = phoneExampleNationalNumber(country) || labels.placeholder;

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
    <div
      id={id}
      className={cn("flex items-stretch gap-2", className)}
    >
      <button id={id ? `${id}-button-2-rkoscw` : undefined}
        type="button"
        disabled={disabled}
        aria-label={labels.country}
        onClick={() => setIsPickerOpen(true)}
        className="asol-control inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-outline-variant bg-surface px-2.5 text-sm text-on-surface transition disabled:opacity-60"
      >
        <span id={id ? `${id}-text-3-ovlaem` : undefined}
          aria-hidden="true"
          className="text-base leading-none"
        >
          {selectedChoice?.flag ?? ""}
        </span>
        <span id={id ? `${id}-text-4-bcbt9n` : undefined}
          dir="ltr"
          className="text-xs font-semibold"
        >
          +{callingCode}
        </span>
      </button>
      <input id={id ? `${id}-input-5-pighzm` : undefined}
        type="tel"
        inputMode="tel"
        dir="ltr"
        disabled={disabled}
        autoComplete={autoComplete}
        placeholder={placeholder}
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
      />
      <PhoneCountryDialog id={id ? `${id}-phone-country-dialog-1b6880` : undefined}
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
