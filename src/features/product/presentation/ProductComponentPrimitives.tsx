"use client";

import * as React from "react";
import { useTranslation } from "@/shared/i18n";
import type { ProductMode } from "./product-component.types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";

export function ProductComponentFrame({ id,
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
} & { id?: string }) {
  return (
    <section id={id} className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
      <h3 id="features-product-presentation-productcomponentprimitives-heading-2-vs3235" className="mb-4 text-lg font-bold">{title}</h3>
      {children}
    </section>
  );
}

export function ProductField({ id,
  label,
  value,
  mode,
  onChange,
  type = "text",
  multiline = false,
}: {
  label: string;
  value: string;
  mode: ProductMode;
  onChange: (value: string) => void;
  type?: React.HTMLInputTypeAttribute | "boolean";
  multiline?: boolean;
} & { id?: string }) {
  const { t, locale } = useTranslation();

  if (mode === "view") {
    if (type === "boolean") {
      const boolValue = value === "true";
      return (
        <div id={id} className="rounded-xl bg-muted/40 px-3 py-2.5">
          <p id="features-product-presentation-productcomponentprimitives-text-4-7xcuaj" className="text-xs text-muted-foreground">{label}</p>
          <p id="features-product-presentation-productcomponentprimitives-text-5-36dxdg" className="mt-1 font-medium">
            {boolValue ? t("product.boolean.yes") : t("product.boolean.no")}
          </p>
        </div>
      );
    }
    return (
      <div id={id} className="rounded-xl bg-muted/40 px-3 py-2.5">
        <p id="features-product-presentation-productcomponentprimitives-text-7-ffxcki" className="text-xs text-muted-foreground">{label}</p>
        <p id="features-product-presentation-productcomponentprimitives-text-8-h2ozjz" className="mt-1 whitespace-pre-wrap break-words font-medium">{value || "—"}</p>
      </div>
    );
  }

  if (type === "boolean") {
    return (
      <label id={id} className="space-y-1.5 text-sm font-medium">
        <span id="features-product-presentation-productcomponentprimitives-text-10-loksc9">{label}</span>
        <Select
          value={value || "false"}
          onValueChange={(val) => onChange(val)}
        >
          <SelectTrigger className="asol-control asol-field-surface w-full border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">
              {t("product.boolean.yes")}
            </SelectItem>
            <SelectItem value="false">
              {t("product.boolean.no")}
            </SelectItem>
          </SelectContent>
        </Select>
      </label>
    );
  }

  const className =
    "asol-control asol-field-surface w-full border border-input px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring";
  return (
    <label id={id} className="space-y-1.5 text-sm font-medium">
      <span id="features-product-presentation-productcomponentprimitives-text-12-orpfaa">{label}</span>
      {multiline ? (
        <textarea id="features-product-presentation-productcomponentprimitives-textarea-13-8i0up3"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`${className} min-h-24 py-3`}
        />
      ) : (
        <input id="features-product-presentation-productcomponentprimitives-input-14-qjtgyz"
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={className}
        />
      )}
    </label>
  );
}
