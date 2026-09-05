"use client";

import * as React from "react";
import Image from "next/image";
import {
  Building2,
  Check,
  Eye,
  PackageOpen,
  Phone,
  ShoppingBag,
  ShoppingBasket,
  Store,
  Trash2,
  Warehouse,
  X,
} from "lucide-react";

import type {
  SellerCardAction,
  SellerCardVariant,
  SellerCardViewModel,
} from "../domain/seller-card.types";

interface SellerCardProps {
  card: SellerCardViewModel;
  variant: SellerCardVariant;
  actions?: SellerCardAction[];
  className?: string;
  favoriteEnabled?: boolean;
  /**
   * Caller-owned favorite control. The package never reaches for a favorites
   * implementation; hosts render one and pass it in.
   */
  favoriteSlot?: React.ReactNode;
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

const commerceFallbackOptions = [
  { Icon: Store, colorClass: "text-orange-600" },
  { Icon: ShoppingBag, colorClass: "text-emerald-600" },
  { Icon: ShoppingBasket, colorClass: "text-amber-600" },
  { Icon: Building2, colorClass: "text-violet-600" },
  { Icon: Warehouse, colorClass: "text-rose-600" },
  { Icon: PackageOpen, colorClass: "text-fuchsia-600" },
] as const;

function fallbackIconIndex(seed: string): number {
  let value = 0;
  for (let index = 0; index < seed.length; index += 1) {
    value = (value * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return value % commerceFallbackOptions.length;
}

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
  favoriteSlot,
  onOpen,
}: SellerCardProps & { id?: string }) {
  const horizontal = variant === "linked-provider" || variant === "compact";
  const fallbackIconSeed = React.useId();
  const fallbackOption =
    commerceFallbackOptions[fallbackIconIndex(fallbackIconSeed)] ?? commerceFallbackOptions[0];
  const FallbackStoreIcon = fallbackOption.Icon;
  const identityColorClass = card.avatarUrl ? "text-blue-600" : fallbackOption.colorClass;
  const showFavorite =
    (favoriteEnabled ??
      (variant === "search" || variant === "category-sellers" || variant === "doctor-sellers")) &&
    Boolean(card.uid);

  return (
    <article id={id} className={`relative ${variantClass[variant]} ${className}`}>
      {showFavorite ? favoriteSlot : null}
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
            />
          ) : (
            <div id="features-seller-card-presentation-sellercard-div-4-a8zanz" className="flex h-full w-full items-center justify-center text-on-surface-variant" aria-hidden="true">
              <FallbackStoreIcon
                className={`${horizontal ? "h-6 w-6" : "h-10 w-10"} ${fallbackOption.colorClass}`}
              />
            </div>
          )}
        </div>
        <div id="features-seller-card-presentation-sellercard-div-5-h5pjcl" className={horizontal ? "min-w-0 flex-1" : "mt-3 min-w-0"}>
          {card.identityLabel ? (
            <div id="features-seller-card-presentation-sellercard-div-10-cduns8" className={`truncate text-center text-sm font-semibold ${identityColorClass}`}>
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
