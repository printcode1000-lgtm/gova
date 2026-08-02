"use client";

import * as React from "react";
import { Heart, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

import type { FavoriteItemInput } from "../entities/favorite.entity";
import { useFavorites } from "../hooks/FavoritesProvider";

interface FavoriteButtonProps {
  item: FavoriteItemInput;
  className?: string;
}

export function FavoriteButton({ item, className }: FavoriteButtonProps) {
  const { isFavorite, isLoading, toggleFavorite } = useFavorites();
  const [isMutating, setIsMutating] = React.useState(false);
  const active = isFavorite(item.type, item.targetId);

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

  return (
    <button
      type="button"
      title={active ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
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
      ) : (
        <Heart className={cn("h-5 w-5", active && "fill-current")} />
      )}
    </button>
  );
}
