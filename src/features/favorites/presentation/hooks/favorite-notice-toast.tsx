"use client";

import * as React from "react";

import type { FavoriteItem } from "../../domain/favorite.entity";
import { uiAttributes } from "@asol/ui-registry-core";

export interface FavoriteNotice {
  message: string;
  removed?: FavoriteItem;
}

export function FavoriteNoticeToast({
  notice,
  onUndo,
}: {
  notice: FavoriteNotice;
  onUndo: () => void;
}) {
  return (
    <div {...uiAttributes({ uid: "favorites.favorite-notice-toast.div.2-33ZfGH", id: "favorites.favorite-notice-toast.div.2" })} id="favorites.favorite-notice-toast.div"
      className="fixed inset-x-4 z-[70] mx-auto flex max-w-sm items-center justify-between gap-3 rounded-xl bg-inverse-surface px-4 py-3 text-sm text-inverse-on-surface shadow-xl"
      style={{
        bottom: "calc(var(--asol-bottom-nav-space) + 0.75rem)",
      }}
    >
      <span {...uiAttributes({ uid: "favorites.favorite-notice-toast.span.2-Y7Y15c", id: "favorites.favorite-notice-toast.span.2" })} id="favorites.favorite-notice-toast.span">{notice.message}</span>
      {notice.removed ? (
        <button {...uiAttributes({ uid: "favorites.favorite-notice-toast.button.2-73d1YY", id: "favorites.favorite-notice-toast.button.2" })} id="favorites.favorite-notice-toast.button"
          type="button"
          className="shrink-0 font-bold text-inverse-primary"
          onClick={onUndo}
        >
          تراجع
        </button>
      ) : null}
    </div>
  );
}
