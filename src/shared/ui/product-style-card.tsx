"use client";

import * as React from "react";

interface ProductStyleCardProps {
  title: string;
  visible: boolean;
  order: number;
  disabled?: boolean;
  children: React.ReactNode;
  onVisibleChange: (visible: boolean) => void;
  onOrderChange: (order: number) => void;
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
}: ProductStyleCardProps) {
  const [orderText, setOrderText] = React.useState(String(order));

  React.useEffect(() => {
    setOrderText(String(order));
  }, [order]);

  return (
    <section className="rounded-xl border border-outline-variant bg-background p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant pb-3">
        <label className="flex items-center gap-2 text-sm font-bold">
          <input
            type="checkbox"
            checked={visible}
            onChange={(event) => onVisibleChange(event.target.checked)}
            disabled={disabled}
            className="h-4 w-4 accent-primary"
          />
          {title}
        </label>
        <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          ترتيب
          <input
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
      <div className="pt-3">{children}</div>
    </section>
  );
}

export function OptionCheckbox({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
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
