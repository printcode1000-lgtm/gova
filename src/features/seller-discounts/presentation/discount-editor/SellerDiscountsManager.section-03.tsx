"use client";

import * as React from "react";
import {
  Copy,
  Gift,
  PackagePlus,
  Percent,
  Plus,
  Save,
  Ticket,
  Trash2,
  Truck,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import type { ProfileSectionStatus } from "@/features/profile/ui";
import {
  createEmptySellerDiscount,
  formatMinorCurrency,
  type SaveSellerDiscountInput,
  type SellerDiscountRule,
  type SellerDiscountType,
  type SellerDiscountValueType,
} from "../../domain/seller-discount.entity";
import { useSellerDiscounts } from "../hooks/use-seller-discounts";
import {
  majorCurrencyInputToMinor,
  minorCurrencyToInputValue,
} from "@asol/format-core";

export function NumberInput({ id,
  value,
  onChange,
  placeholder,
}: {
  value: number;
  onChange: (value: number) => void;
  placeholder: string;
} & { id?: string }) {
  return (
    <Input id={id}
      type="number"
      min={0}
      value={value === 0 ? "" : String(value)}
      placeholder={placeholder}
      onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))}
    />
  );
}

export function MinorCurrencyInput({ id,
  value,
  onChange,
  placeholder,
}: {
  value: number;
  onChange: (value: number) => void;
  placeholder: string;
} & { id?: string }) {
  return (
    <Input id={id}
      type="number"
      min={0}
      step="0.01"
      inputMode="decimal"
      value={minorCurrencyToInputValue(value)}
      placeholder={placeholder}
      onChange={(event) => onChange(majorCurrencyInputToMinor(event.target.value))}
    />
  );
}

export function Toggle({ id,
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
} & { id?: string }) {
  return (
    <Button id={id}
      type="button"
      variant={active ? "default" : "outline"}
      className="h-8 rounded-full px-3 text-xs"
      onClick={onClick}
    >
      {label}
    </Button>
  );
}
