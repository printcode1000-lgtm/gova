"use client";

import * as React from "react";
import Image from "next/image";
import { createOpaqueUiInstanceId, uiAttributes, uiForwardedAttributes, type UiDescriptor } from "@asol/ui-registry-core";

export interface CategoryTabsStripItem {
  id: string;
  label: string;
  /** Omitted by callers whose tabs are named rather than pictured. */
  imageUrl?: string;
  count?: number;
}

export type CategoryTabsStripLevel = "main" | "sub";

interface CategoryTabsStripProps {
  id?: string;
  items: readonly CategoryTabsStripItem[];
  selectedId: string;
  level?: CategoryTabsStripLevel;
  snapshotId?: string;
  itemUi: UiDescriptor;
  onSelect: (id: string) => void;
}

const STRIP_CLASS =
  "flex snap-x snap-mandatory scroll-smooth gap-2 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

const LEVEL_STYLE: Record<
  CategoryTabsStripLevel,
  {
    button: string;
    selected: string;
    idle: string;
    image: string;
  }
> = {
  main: {
    button:
      "flex h-12 min-w-fit shrink-0 snap-center snap-always items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition",
    selected: "border-primary bg-primary text-on-primary",
    idle: "border-outline-variant bg-surface text-on-surface",
    image: "relative h-7 w-7 overflow-hidden rounded-md bg-surface-bright",
  },
  sub: {
    button:
      "flex h-10 min-w-fit shrink-0 snap-center snap-always items-center gap-2 rounded-lg border px-3 text-[11px] font-semibold transition",
    selected: "border-tertiary bg-tertiary text-on-tertiary",
    idle: "border-outline-variant bg-surface-container-low text-on-surface",
    image: "relative h-6 w-6 overflow-hidden rounded bg-surface-bright",
  },
};

/**
 * Horizontal, snap-scrolling strip of catalog tabs.
 *
 * Pure presentation: it owns the tab look and the scroll behaviour only, so
 * every caller keeps its own data source and selection rules.
 */
export function CategoryTabsStrip({
  id,
  items,
  selectedId,
  level = "main",
  snapshotId,
  itemUi: ui,
  onSelect,
}: CategoryTabsStripProps & { id?: string }) {
  const style = LEVEL_STYLE[level];

  return (
    <div {...uiAttributes({ uid: "shared.category-tabs-strip.div-VEz49x", id: "shared.category-tabs-strip.div" })}
      id={id}
      data-snapshot-scroll={snapshotId ? "" : undefined}
      data-snapshot-id={snapshotId}
      className={STRIP_CLASS}
    >
      {items.map((item) => (
        <button
          key={item.id}
          {...uiForwardedAttributes(ui, createOpaqueUiInstanceId("category-tab", item.id))}
          type="button"
          aria-pressed={item.id === selectedId}
          onClick={() => onSelect(item.id)}
          className={`${style.button} ${
            item.id === selectedId ? style.selected : style.idle
          }`}
        >
          {item.imageUrl ? (
            <span {...uiAttributes({ uid: "shared.category-tabs-strip.span-XuoZe0", id: "shared.category-tabs-strip.span" , instance: createOpaqueUiInstanceId("iter-8fc433f4cd", String(item.id))})} className={style.image}>
              <Image
                src={item.imageUrl}
                alt={item.label}
                fill
                className="object-cover"
              />
            </span>
          ) : null}
          <span {...uiAttributes({ uid: "shared.category-tabs-strip.span.2-KXDQ6N", id: "shared.category-tabs-strip.span.2" , instance: createOpaqueUiInstanceId("iter-a2ac0b436f", String(item.id))})} className="whitespace-nowrap">{item.label}</span>
          {typeof item.count === "number" ? (
            <span {...uiAttributes({ uid: "shared.category-tabs-strip.span.3-61oJVU", id: "shared.category-tabs-strip.span.3" , instance: createOpaqueUiInstanceId("iter-221ff5de57", String(item.id))})} className="rounded-full bg-black/10 px-1.5 text-[10px]">
              {item.count}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

export default CategoryTabsStrip;
