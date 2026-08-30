"use client";

import * as React from "react";
import { Heart, Loader2, UserCheck, UserPlus } from "lucide-react";

import { cn } from "@/shared/utils";

import type { FavoriteItemInput } from "../domain/favorite.entity";
import { useFavorites } from "./hooks/FavoritesProvider";

interface FavoriteButtonProps {
  item: FavoriteItemInput;
  className?: string;
  label?: React.ReactNode;
  /** Registered UiRegistry descriptor for this instance, from the caller. */
  /**
   * "favorite" (default) shows a heart for a private saved-item list.
   * "follow" shows a follow-style icon for targets that also become a
   * public Follow System record (sellers) so it isn't confused with a
   * plain heart/like.
   */
  variant?: "favorite" | "follow";
}

export function FavoriteButton({ item, className, label, variant = "favorite" }: FavoriteButtonProps & { id?: string }) {
  const { isFavorite, isLoading, toggleFavorite } = useFavorites();
  const [isMutating, setIsMutating] = React.useState(false);
  const active = isFavorite(item.type, item.targetId);
  const isFollow = variant === "follow";

  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (isMutating) return;
    setIsMutating(true);
    try {
      await toggleFavorite(item);
    } finally {
      setIsMutating(false);
    }
  };

  const ariaLabel = isFollow
    ? active
      ? "إلغاء متابعة البائع"
      : "متابعة البائع"
    : active
      ? "إزالة من المفضلة"
      : "إضافة إلى المفضلة";

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={(event) => void handleClick(event)}
      disabled={isLoading || isMutating}
      className={cn(
        "flex h-12 w-12 items-center justify-center rounded-full border border-outline-variant/70 bg-surface/90 text-on-surface-variant shadow-sm backdrop-blur-sm transition active:scale-90 disabled:opacity-70",
        active && "border-primary/30 bg-primary-container text-on-primary-container",
        className,
      )}
    >
      {isLoading || isMutating ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : isFollow ? (
        active ? (
          <UserCheck className="h-5 w-5" />
        ) : (
          <UserPlus className="h-5 w-5" />
        )
      ) : (
        <Heart className={cn("h-5 w-5", active && "fill-current")} />
      )}
      {label ? <span>{label}</span> : null}
    </button>
  );
}
