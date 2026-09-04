"use client";

import * as React from "react";
import Image from "next/image";
import { Check, Eye, Phone, Store, Trash2, X } from "lucide-react";

import type {
  SellerCardAction,
  SellerCardVariant,
  SellerCardViewModel,
} from "@/features/seller-card";
import { shouldUseUnoptimizedImage } from '@asol/storage-core';
import { FavoriteButton, favoriteFromSellerCard } from "@/features/favorites";

interface SellerCardProps {
  card: SellerCardViewModel;
  variant: SellerCardVariant;
  actions?: SellerCardAction[];
  className?: string;
  favoriteEnabled?: boolean;
  /** Caller-owned identity for the card's primary action. Mandatory. */
  onOpen?: (
    event: React.MouseEvent<HTMLButtonElement>,
    card: SellerCardViewModel,
  ) => void;
}

const variantClass: Record<SellerCardVariant, string> = {
  search: "rounded-lg border border-outline-variant bg-surface p-4 text-center",
  "category-sellers": "rounded-xl border border-outline-variant bg-surface p-4 text-center shadow-sm transition",
  "doctor-sellers": "rounded-xl border border-outline-variant bg-surface p-4 text-center shadow-sm transition",
  "linked-provider": "rounded-lg border border-outline-variant bg-surface p-3",
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
  if (action.tone === "danger") return "bg-surface-container-low text-destructive";
  if (action.tone === "tertiary" || action.active) return "bg-tertiary text-on-tertiary";
  if (action.tone === "primary") return "bg-primary text-on-primary";
  return "bg-surface-container-low text-on-surface";
}

export function SellerCard({ id,
  card,
  variant,
  actions = [],
  className = "",
  favoriteEnabled,
  onOpen,
}: SellerCardProps & { id?: string }) {
  const horizontal = variant === "linked-provider" || variant === "compact";
  const showFavorite =
    (favoriteEnabled ??
      (variant === "search" || variant === "category-sellers" || variant === "doctor-sellers")) &&
    Boolean(card.uid);

  return (
    <article id={id} className={`relative ${variantClass[variant]} ${className}`}>
      {showFavorite ? (
        <FavoriteButton
          item={favoriteFromSellerCard(card)}
          variant="follow"
          className="absolute end-2 top-2 z-10"
        />
      ) : null}
      <button id="features-seller-card-presentation-sellercard-button-2-nwaag6"
        type="button"
        onClick={(event) => onOpen?.(event, card)}
        className={`w-full text-start focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary ${horizontal ? "flex items-center gap-3" : "block"}`}
        aria-label={card.title || card.href}
      >
        <div id="features-seller-card-presentation-sellercard-div-3-mohi8d"
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
            <div id="features-seller-card-presentation-sellercard-div-4-a8zanz" className="flex h-full w-full items-center justify-center text-lg font-bold text-on-surface-variant">
              {card.initials !== "?" ? card.initials : <Store className="h-6 w-6" />}
            </div>
          )}
        </div>
        <div id="features-seller-card-presentation-sellercard-div-5-h5pjcl" className={horizontal ? "min-w-0 flex-1" : "mt-3 min-w-0"}>
          {card.title ? (
            <p id="features-seller-card-presentation-sellercard-text-6-wps3w8" className="line-clamp-2 text-sm font-semibold text-on-surface">{card.title}</p>
          ) : null}
          {card.subtitle ? (
            <p id="features-seller-card-presentation-sellercard-text-7-5oubzx" className="mt-1 truncate text-[11px] text-on-surface-variant">{card.subtitle}</p>
          ) : null}
          {card.description && !horizontal ? (
            <p id="features-seller-card-presentation-sellercard-text-8-dfwtzu" className="mt-1 line-clamp-2 text-[11px] text-on-surface-variant">{card.description}</p>
          ) : null}
          {card.ratingText ? (
            <p id="features-seller-card-presentation-sellercard-text-9-yxq7sa" className="mt-1 text-[11px] font-medium text-tertiary">{card.ratingText}</p>
          ) : null}
          {card.identityLabel ? (
            <div id="features-seller-card-presentation-sellercard-div-10-cduns8" className="mt-2 text-center text-[10px] text-on-surface-variant">
              {card.identityLabel}
            </div>
          ) : null}
        </div>
      </button>
      {actions.length > 0 ? (
        <div id="features-seller-card-presentation-sellercard-div-12-4ndc3q"
          className="mt-3 grid gap-1"
          style={{ gridTemplateColumns: `repeat(${actions.length}, minmax(0, 1fr))` }}
        >
          {actions.map((action, actionIndex) => (
            <button
              key={`${action.kind}-${action.label}`}
              type="button"
              disabled={action.disabled}
              onClick={action.onClick}
              className={`flex h-8 items-center justify-center rounded-md transition disabled:opacity-50 ${actionClass(action)}`}
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
