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
  showTitle = true,
  compactPadding = false,
}: {
  title: string;
  children: React.ReactNode;
  showTitle?: boolean;
  compactPadding?: boolean;
} & { id?: string }) {
  return (
    <section
      id={id}
      className={`rounded-2xl border bg-card shadow-sm ${compactPadding ? "overflow-hidden p-0" : "p-4 sm:p-5"}`}
    >
      {showTitle ? (
        <h3
          id={id ? `${id}-title-8q1w5e` : undefined}
          className="mb-4 text-lg font-bold"
        >
          {title}
        </h3>
      ) : null}
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
  centered = false,
  blueLabel = false,
  hideLabel = false,
  nowrapLabel = false,
  nowrapValue = false,
  cardSurface = false,
}: {
  label: string;
  value: string;
  mode: ProductMode;
  onChange: (value: string) => void;
  type?: React.HTMLInputTypeAttribute | "boolean";
  multiline?: boolean;
  centered?: boolean;
  blueLabel?: boolean;
  hideLabel?: boolean;
  nowrapLabel?: boolean;
  nowrapValue?: boolean;
  cardSurface?: boolean;
} & { id?: string }) {
  const { t, locale } = useTranslation();

  if (mode === "view") {
    if (type === "boolean") {
      const boolValue = value === "true";
      return (
        <div id={id} className={`rounded-xl px-3 py-2.5 ${cardSurface ? "flex min-h-[66px] flex-col items-center justify-center border border-border bg-card text-center shadow-sm" : "bg-muted/40"} ${centered ? "text-center" : ""}`}>
          {!hideLabel ? (
            <p
              id={id ? `${id}-boolean-label-3m7c1p` : undefined}
              className={`text-xs ${nowrapLabel ? "whitespace-nowrap" : ""} ${blueLabel ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"}`}
            >
              {label}
            </p>
          ) : null}
          <p
            id={id ? `${id}-boolean-value-6h2v9k` : undefined}
            className={`mt-1 font-medium ${nowrapValue ? "whitespace-nowrap" : ""}`}
          >
            {boolValue ? t("product.boolean.yes") : t("product.boolean.no")}
          </p>
        </div>
      );
    }
    return (
      <div id={id} className={`rounded-xl px-3 py-2.5 ${cardSurface ? "flex min-h-[66px] flex-col items-center justify-center border border-border bg-card text-center shadow-sm" : "bg-muted/40"} ${centered ? "text-center" : ""}`}>
        {!hideLabel ? (
          <p
            id={id ? `${id}-label-4n8x2d` : undefined}
            className={`text-xs ${nowrapLabel ? "whitespace-nowrap" : ""} ${blueLabel ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"}`}
          >
            {label}
          </p>
        ) : null}
        <p
          id={id ? `${id}-value-7b1r5m` : undefined}
          className={`mt-1 font-medium ${nowrapValue ? "whitespace-nowrap" : "whitespace-pre-wrap break-words"}`}
        >
          {value || "—"}
        </p>
      </div>
    );
  }

  if (type === "boolean") {
    return (
      <label id={id} className="space-y-1.5 text-sm font-medium">
        {!hideLabel ? (
          <span id={id ? `${id}-edit-label-2f6p9c` : undefined} className={nowrapLabel ? "whitespace-nowrap" : undefined}>{label}</span>
        ) : null}
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
      {!hideLabel ? <span className={nowrapLabel ? "whitespace-nowrap" : undefined}>{label}</span> : null}
      {multiline ? (
        <textarea
          id={id ? `${id}-textarea-5k1d8v` : undefined}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`${className} min-h-24 py-3`}
        />
      ) : (
        <input
          id={id ? `${id}-input-9c3m6q` : undefined}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={className}
        />
      )}
    </label>
  );
}
