"use client";

import * as React from "react";
import { uiAttributes } from "@asol/ui-registry-core";

interface ProductStyleCardProps {
  title: string;
  visible: boolean;
  order: number;
  disabled?: boolean;
  children: React.ReactNode;
  onVisibleChange: (visible: boolean) => void;
  onOrderChange: (order: number) => void;
  id?: string;
}

function parsePositiveInteger(value: string, fallback: number) {
  const next = Number(value);
  return Number.isInteger(next) && next >= 1 ? next : fallback;
}

export function ProductStyleCard({
  title,
  visible,
  order,
  disabled = false,
  children,
  onVisibleChange,
  onOrderChange,
  id,
}: ProductStyleCardProps & { id?: string }) {
  const [orderText, setOrderText] = React.useState(String(order));

  React.useEffect(() => {
    setOrderText(String(order));
  }, [order]);

  return (
    <section {...uiAttributes({ uid: "shared.product-style-card.section-O43dRJ", id: "shared.product-style-card.section" })} id={id} className="rounded-xl border border-outline-variant bg-background p-4 shadow-sm">
      <div {...uiAttributes({ uid: "shared.product-style-card.div-r674Tm", id: "shared.product-style-card.div" })} className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant pb-3">
        <label {...uiAttributes({ uid: "shared.product-style-card.label-Sc5Le8", id: "shared.product-style-card.label" })} className="flex items-center gap-2 text-sm font-bold">
          <input {...uiAttributes({ uid: "shared.product-style-card.input-s5cRM4", id: "shared.product-style-card.input" })}
            type="checkbox"
            checked={visible}
            onChange={(event) => onVisibleChange(event.target.checked)}
            disabled={disabled}
            className="h-4 w-4 accent-primary"
          />
          {title}
        </label>
        <label {...uiAttributes({ uid: "shared.product-style-card.label.2-3uG6dx", id: "shared.product-style-card.label.2" })} className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          ترتيب
          <input {...uiAttributes({ uid: "shared.product-style-card.input.2-t4fR5K", id: "shared.product-style-card.input.2" })}
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={orderText}
            onChange={(event) => {
              const value = event.target.value;
              if (value === "" || /^\d+$/.test(value)) {
                if (value === "0") return;
                setOrderText(value);
                if (value) onOrderChange(parsePositiveInteger(value, order));
              }
            }}
            onBlur={() => {
              const next = parsePositiveInteger(orderText, order);
              setOrderText(String(next));
              onOrderChange(next);
            }}
            disabled={disabled}
            className="asol-control asol-field-surface h-9 w-20 border border-input px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
      </div>
      <div {...uiAttributes({ uid: "shared.product-style-card.div.2-OrD7Ue", id: "shared.product-style-card.div.2" })} className="pt-3">{children}</div>
    </section>
  );
}

export function OptionCheckbox({
  label,
  checked,
  disabled,
  onChange,
  id,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
}) {
  return (
    <label {...uiAttributes({ uid: "shared.product-style-card.label.3-eQ43I7", id: "shared.product-style-card.label.3" })} id={id} className="flex items-center gap-2 text-sm">
      <input {...uiAttributes({ uid: "shared.product-style-card.input.3-I18g7D", id: "shared.product-style-card.input.3" })}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
        className="h-4 w-4 accent-primary"
      />
      {label}
    </label>
  );
}
