"use client";

import * as React from "react";
import { useTranslation } from "@/lib/i18n";
import type { ProductMode } from "./product-component.types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ProductComponentFrame({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
      <h3 className="mb-4 text-lg font-bold">{title}</h3>
      {children}
    </section>
  );
}

export function ProductField({
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
}) {
  const { t, locale } = useTranslation();

  if (mode === "view") {
    if (type === "boolean") {
      const boolValue = value === "true";
      return (
        <div className="rounded-xl bg-muted/40 px-3 py-2.5">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 font-medium">
            {boolValue ? t("product.boolean.yes") : t("product.boolean.no")}
          </p>
        </div>
      );
    }
    return (
      <div className="rounded-xl bg-muted/40 px-3 py-2.5">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 font-medium">{value || "—"}</p>
      </div>
    );
  }

  if (type === "boolean") {
    return (
      <label className="space-y-1.5 text-sm font-medium">
        <span>{label}</span>
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
    <label className="space-y-1.5 text-sm font-medium">
      <span>{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`${className} min-h-24 py-3`}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={className}
        />
      )}
    </label>
  );
}
