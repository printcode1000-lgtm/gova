"use client";

import * as React from "react";

import type { FavoriteItem } from "../domain/favorite.entity";

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
    <div id='favorites-presentation-hooks-favorite-notice-toast-div-1-shpuv1'
      className="fixed inset-x-4 z-[70] mx-auto flex max-w-sm items-center justify-between gap-3 rounded-xl bg-inverse-surface px-4 py-3 text-sm text-inverse-on-surface shadow-xl"
      style={{
        bottom: "calc(var(--asol-bottom-nav-space) + 0.75rem)",
      }}
    >
      <span id='favorites-presentation-hooks-favorite-notice-toast-text-2-96rsal'>{notice.message}</span>
      {notice.removed ? (
        <button id='favorites-presentation-hooks-favorite-notice-toast-button-3-nt9bef'
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
