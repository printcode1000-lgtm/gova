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
import { uiAttributes } from "@asol/ui-registry-core";

export function ProductComponentFrame({ id,
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
} & { id?: string }) {
  return (
    <section {...uiAttributes({ uid: "product.product-component-primitives.section-2Hp2NY", id: "product.product-component-primitives.section" })} id={id} className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
      <h3 {...uiAttributes({ uid: "product.product-component-primitives.h3-sea0WJ", id: "product.product-component-primitives.h3" })} className="mb-4 text-lg font-bold">{title}</h3>
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
        <div {...uiAttributes({ uid: "product.product-component-primitives.div-7X5c25", id: "product.product-component-primitives.div" })} id={id} className="rounded-xl bg-muted/40 px-3 py-2.5">
          <p {...uiAttributes({ uid: "product.product-component-primitives.p-qI7QT0", id: "product.product-component-primitives.p" })} className="text-xs text-muted-foreground">{label}</p>
          <p {...uiAttributes({ uid: "product.product-component-primitives.p.2-89NIf1", id: "product.product-component-primitives.p.2" })} className="mt-1 font-medium">
            {boolValue ? t("product.boolean.yes") : t("product.boolean.no")}
          </p>
        </div>
      );
    }
    return (
      <div {...uiAttributes({ uid: "product.product-component-primitives.div.2-ktK8EB", id: "product.product-component-primitives.div.2" })} id={id} className="rounded-xl bg-muted/40 px-3 py-2.5">
        <p {...uiAttributes({ uid: "product.product-component-primitives.p.3-2sx1BT", id: "product.product-component-primitives.p.3" })} className="text-xs text-muted-foreground">{label}</p>
        <p {...uiAttributes({ uid: "product.product-component-primitives.p.4-QOpP1R", id: "product.product-component-primitives.p.4" })} className="mt-1 whitespace-pre-wrap break-words font-medium">{value || "—"}</p>
      </div>
    );
  }

  if (type === "boolean") {
    return (
      <label {...uiAttributes({ uid: "product.product-component-primitives.label-Ow9AhV", id: "product.product-component-primitives.label" })} id={id} className="space-y-1.5 text-sm font-medium">
        <span {...uiAttributes({ uid: "product.product-component-primitives.span-yarEo0", id: "product.product-component-primitives.span" })}>{label}</span>
        <Select
          value={value || "false"}
          onValueChange={(val) => onChange(val)}
        >
          <SelectTrigger ui={{ uid: "product.product-component-primitives.select-trigger-p9LnTT", id: "product.product-component-primitives.select-trigger" }} className="asol-control asol-field-surface w-full border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem ui={{ uid: "product.product-component-primitives.select-item-pVpP4i", id: "product.product-component-primitives.select-item" }} value="true">
              {t("product.boolean.yes")}
            </SelectItem>
            <SelectItem ui={{ uid: "product.product-component-primitives.select-item.2-31y8CQ", id: "product.product-component-primitives.select-item.2" }} value="false">
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
    <label {...uiAttributes({ uid: "product.product-component-primitives.label.2-KqhE3I", id: "product.product-component-primitives.label.2" })} id={id} className="space-y-1.5 text-sm font-medium">
      <span {...uiAttributes({ uid: "product.product-component-primitives.span.2-1M3Q3W", id: "product.product-component-primitives.span.2" })}>{label}</span>
      {multiline ? (
        <textarea {...uiAttributes({ uid: "product.product-component-primitives.textarea-D40AcH", id: "product.product-component-primitives.textarea" })}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`${className} min-h-24 py-3`}
        />
      ) : (
        <input {...uiAttributes({ uid: "product.product-component-primitives.input-zRl20E", id: "product.product-component-primitives.input" })}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={className}
        />
      )}
    </label>
  );
}
