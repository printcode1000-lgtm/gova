"use client";

import * as React from "react";
import type { ProductMode } from "./product-component.types";

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
  type?: React.HTMLInputTypeAttribute;
  multiline?: boolean;
}) {
  if (mode === "view")
    return (
      <div className="rounded-xl bg-muted/40 px-3 py-2.5">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 font-medium">{value || "—"}</p>
      </div>
    );
  const className =
    "gova-control gova-field-surface w-full border border-input px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring";
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
