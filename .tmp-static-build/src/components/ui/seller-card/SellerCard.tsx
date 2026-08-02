"use client";

import * as React from "react";
import Image from "next/image";
import { Check, Eye, Phone, Store, Trash2, X } from "lucide-react";

import type {
  SellerCardAction,
  SellerCardVariant,
  SellerCardViewModel,
} from "@/features/seller-card";
import { shouldUseUnoptimizedImage } from "@/lib/images/external-image";
import { FavoriteButton, favoriteFromSellerCard } from "@/features/favorites";

interface SellerCardProps {
  card: SellerCardViewModel;
  variant: SellerCardVariant;
  actions?: SellerCardAction[];
  className?: string;
  favoriteEnabled?: boolean;
  onOpen?: (
    event: React.MouseEvent<HTMLButtonElement>,
    card: SellerCardViewModel,
  ) => void;
}

const variantClass: Record<SellerCardVariant, string> = {
  search: "rounded-lg border border-outline-variant bg-surface p-4 text-center",
  "category-sellers":
    "rounded-xl border border-outline-variant bg-surface p-4 text-center shadow-sm transition hover:border-primary/60 hover:shadow-md",
  "doctor-sellers":
    "rounded-xl border border-outline-variant bg-surface p-4 text-center shadow-sm transition hover:border-primary/60 hover:shadow-md",
  "linked-provider":
    "rounded-lg border border-outline-variant bg-surface p-3",
  compact: "rounded-lg border border-outline-variant bg-surface p-3",
};

const avatarClass: Record<SellerCardVariant, string> = {
  search: "mx-auto h-16 w-16 rounded-full",
  "category-sellers": "mx-auto h-24 w-24 rounded-full",
  "doctor-sellers": "mx-auto h-24 w-24 rounded-full",
  "linked-provider": "h-12 w-12 rounded-full",
  compact: "h-12 w-12 rounded-full",
};

function actionIcon(kind: SellerCardAction["kind"]) {
  if (kind === "select") return <Check className="h-4 w-4" />;
  if (kind === "remove") return <X className="h-4 w-4" />;
  if (kind === "contact") return <Phone className="h-4 w-4" />;
  if (kind === "custom") return <Trash2 className="h-4 w-4" />;
  return <Eye className="h-4 w-4" />;
}

function actionClass(action: SellerCardAction) {
  if (action.tone === "danger") {
    return "bg-surface-container-low text-destructive hover:bg-destructive hover:text-on-destructive";
  }
  if (action.tone === "tertiary" || action.active) {
    return "bg-tertiary text-on-tertiary hover:bg-tertiary/90";
  }
  if (action.tone === "primary") {
    return "bg-primary text-on-primary hover:bg-primary/90";
  }
  return "bg-surface-container-low text-on-surface hover:bg-primary hover:text-on-primary";
}

function badgeClass(tone: SellerCardViewModel["badges"][number]["tone"]) {
  if (tone === "danger") return "bg-destructive/10 text-destructive";
  if (tone === "primary") return "bg-primary/10 text-primary";
  if (tone === "tertiary") return "bg-tertiary/15 text-tertiary";
  return "bg-surface-container-high text-on-surface-variant";
}

export function SellerCard({
  card,
  variant,
  actions = [],
  className = "",
  favoriteEnabled,
  onOpen,
}: SellerCardProps) {
  const horizontal = variant === "linked-provider" || variant === "compact";
  const showFavorite =
    (favoriteEnabled ??
      (variant === "search" ||
        variant === "category-sellers" ||
        variant === "doctor-sellers")) &&
    Boolean(card.uid);

  return (
    <article className={`relative ${variantClass[variant]} ${className}`}>
      {showFavorite ? (
        <FavoriteButton
          item={favoriteFromSellerCard(card)}
          className="absolute end-2 top-2 z-10"
        />
      ) : null}
      <button
        type="button"
        onClick={(event) => onOpen?.(event, card)}
        className={`w-full text-start focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary ${
          horizontal ? "flex items-center gap-3" : "block"
        }`}
        aria-label={card.title}
      >
        <div
          className={`relative shrink-0 overflow-hidden bg-surface-bright ${avatarClass[variant]}`}
        >
          {card.avatarUrl ? (
            <Image
              src={card.avatarUrl}
              alt={card.title}
              fill
              className="object-cover"
              sizes={horizontal ? "48px" : "96px"}
              unoptimized={shouldUseUnoptimizedImage(card.avatarUrl)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-lg font-bold text-on-surface-variant">
              {card.initials !== "?" ? card.initials : <Store className="h-6 w-6" />}
            </div>
          )}
        </div>
        <div className={horizontal ? "min-w-0 flex-1" : "mt-3 min-w-0"}>
          <p className="line-clamp-2 text-sm font-semibold text-on-surface">
            {card.title}
          </p>
          {card.subtitle ? (
            <p className="mt-1 truncate text-[11px] text-on-surface-variant">
              {card.subtitle}
            </p>
          ) : null}
          {card.description && !horizontal ? (
            <p className="mt-1 line-clamp-2 text-[11px] text-on-surface-variant">
              {card.description}
            </p>
          ) : null}
          {card.ratingText ? (
            <p className="mt-1 text-[11px] font-medium text-tertiary">
              {card.ratingText}
            </p>
          ) : null}
          {card.badges.length > 0 ? (
            <div className="mt-2 flex flex-wrap justify-center gap-1">
              {card.badges.map((badge) => (
                <span
                  key={badge.label}
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${badgeClass(
                    badge.tone,
                  )}`}
                >
                  {badge.label}
                </span>
              ))}
            </div>
          ) : null}
          {!horizontal ? (
            <p className="mt-1 truncate text-[10px] text-on-surface-variant">
              {card.uid}
            </p>
          ) : null}
        </div>
      </button>
      {actions.length > 0 ? (
        <div
          className="mt-3 grid gap-1"
          style={{
            gridTemplateColumns: `repeat(${actions.length}, minmax(0, 1fr))`,
          }}
        >
          {actions.map((action) => (
            <button
              key={`${action.kind}-${action.label}`}
              type="button"
              disabled={action.disabled}
              onClick={action.onClick}
              className={`flex h-8 items-center justify-center rounded-md transition disabled:opacity-50 ${actionClass(
                action,
              )}`}
              title={action.label}
              aria-label={action.label}
            >
              {actionIcon(action.kind)}
            </button>
          ))}
        </div>
      ) : null}
    </article>
  );
}
