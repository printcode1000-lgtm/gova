"use client";

import * as React from "react";
import Image from "next/image";
import {
  Eye,
  Heart,
  Package,
  Pencil,
  ShoppingCart,
  Star,
  Trash2,
} from "lucide-react";

import type {
  ProductCardAction,
  ProductCardVariant,
  ProductCardViewModel,
} from "@/features/product-card";
import { shouldUseUnoptimizedImage } from '@asol/storage-core';
import { FavoriteButton, favoriteFromProductCard } from "@/features/favorites";
import {
  composeUiInstanceId,
  createUiPositionInstanceId,
  uiAttributes,
  type UiDescriptor,
} from "@asol/ui-registry-core";

interface ProductCardProps {
  card: ProductCardViewModel;
  variant: ProductCardVariant;
  actions?: ProductCardAction[];
  className?: string;
  favoriteEnabled?: boolean;
  /** Caller-owned identity for the card's primary action. Mandatory. */
  ui: UiDescriptor;
  onOpen?: (
    event: React.MouseEvent<HTMLButtonElement>,
    card: ProductCardViewModel,
  ) => void;
}

const variantClass: Record<ProductCardVariant, string> = {
  search: "rounded-lg border border-outline-variant bg-surface",
  "profile-preview": "rounded-lg border border-outline-variant bg-surface transition",
  "profile-edit": "rounded-lg border border-outline-variant bg-surface transition",
  "featured-marquee": "w-40 rounded-xl p-2 asol-card-tonal asol-card-tonal-tertiary active:scale-95 transition-transform",
  compact: "rounded-lg border border-outline-variant bg-surface",
};

const imageClass: Record<ProductCardVariant, string> = {
  search: "aspect-square",
  "profile-preview": "aspect-square",
  "profile-edit": "aspect-square",
  "featured-marquee": "aspect-square rounded-lg",
  compact: "aspect-square",
};

function actionIcon(kind: ProductCardAction["kind"]) {
  if (kind === "edit") return <Pencil className="h-4 w-4" />;
  if (kind === "delete") return <Trash2 className="h-4 w-4" />;
  if (kind === "toggleFeatured") return <Star className="h-4 w-4" />;
  if (kind === "addToCart") return <ShoppingCart className="h-4 w-4" />;
  if (kind === "favorite") return <Heart className="h-4 w-4" />;
  return <Eye className="h-4 w-4" />;
}

function actionClass(action: ProductCardAction) {
  if (action.tone === "danger") return "bg-surface-container-low text-destructive";
  if (action.tone === "tertiary" || action.active) return "bg-tertiary text-on-tertiary";
  if (action.tone === "primary") return "bg-primary text-on-primary";
  return "bg-surface-container-low text-on-surface";
}

function badgeClass(tone: ProductCardViewModel["badges"][number]["tone"]) {
  if (tone === "danger") return "bg-destructive/10 text-destructive";
  if (tone === "primary") return "bg-primary/10 text-primary";
  if (tone === "tertiary") return "bg-tertiary/15 text-tertiary";
  return "bg-surface-container-high text-on-surface-variant";
}

export function ProductCard({ id,
  card,
  variant,
  actions = [],
  className = "",
  favoriteEnabled,
  ui,
  onOpen,
}: ProductCardProps & { id?: string }) {
  const isFeatured = variant === "featured-marquee";
  const hasActions = actions.length > 0;
  const showFavorite =
    (favoriteEnabled ?? (variant === "search" || variant === "profile-preview")) &&
    Boolean(card.id);

  return (
    <article {...uiAttributes({ uid: "product-card.product-card.article-YO94HZ", id: "product-card.product-card.article", instance: ui.instance })} id={id} className={`relative min-w-0 overflow-hidden ${variantClass[variant]} ${className}`}>
      {showFavorite ? (
        <FavoriteButton
          item={favoriteFromProductCard(card)}
          ui={{
            uid: "product-card.favorite-button-H7fV3n",
            id: "product-card.favorite-button",
            kind: "action",
            action: "favorite",
            instance: ui.instance,
          }}
          className="absolute end-2 top-2 z-10"
        />
      ) : null}
      <button
        {...uiAttributes(ui)}
        type="button"
        onClick={(event) => onOpen?.(event, card)}
        className="block w-full min-w-0 text-start focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={card.title}
      >
        <div {...uiAttributes({ uid: "product-card.product-card.div-37L7FD", id: "product-card.product-card.div", instance: ui.instance })}
          className={`relative bg-surface-bright ${imageClass[variant]} ${isFeatured ? "mb-2 overflow-hidden" : ""}`}
        >
          {card.imageUrl ? (
            <Image
              src={card.imageUrl}
              alt={card.title}
              fill
              className="object-cover"
              sizes={isFeatured ? "160px" : "(max-width: 768px) 50vw, 25vw"}
              unoptimized={shouldUseUnoptimizedImage(card.imageUrl)}
            />
          ) : (
            <Package className="absolute inset-0 m-auto h-9 w-9 text-on-surface-variant" />
          )}
        </div>
        <div {...uiAttributes({ uid: "product-card.product-card.div.2-6sO2gL", id: "product-card.product-card.div.2", instance: ui.instance })} className={isFeatured ? "min-w-0 space-y-1" : "min-w-0 space-y-1 p-2"}>
          {card.categoryLabel && !isFeatured ? (
            <p {...uiAttributes({ uid: "product-card.product-card.p-2LvYHC", id: "product-card.product-card.p", instance: ui.instance })} className="truncate text-[10px] font-medium text-on-surface-variant">
              {card.categoryLabel}
            </p>
          ) : null}
          <p {...uiAttributes({ uid: "product-card.product-card.p.2-8fPXz2", id: "product-card.product-card.p.2", instance: ui.instance })}
            className={isFeatured ? "truncate text-xs font-semibold text-on-surface" : "line-clamp-2 min-h-[32px] break-words text-xs font-semibold text-on-surface"}
          >
            {card.title}
          </p>
          {card.subtitle && !isFeatured ? (
            <p {...uiAttributes({ uid: "product-card.product-card.p.3-BhL0lK", id: "product-card.product-card.p.3", instance: ui.instance })} className="truncate text-[11px] text-on-surface-variant">
              {card.subtitle}
            </p>
          ) : null}
          <div {...uiAttributes({ uid: "product-card.product-card.div.3-4JWO57", id: "product-card.product-card.div.3", instance: ui.instance })} className="flex min-w-0 flex-wrap items-center gap-1.5">
            {card.priceText ? (
              <p {...uiAttributes({ uid: "product-card.product-card.p.4-uVWZ4V", id: "product-card.product-card.p.4", instance: ui.instance })} className="min-w-0 break-words text-xs font-bold text-primary">{card.priceText}</p>
            ) : null}
            {card.oldPriceText && !isFeatured ? (
              <p {...uiAttributes({ uid: "product-card.product-card.p.5-yI5AlC", id: "product-card.product-card.p.5", instance: ui.instance })} className="min-w-0 break-words text-[10px] text-on-surface-variant line-through">{card.oldPriceText}</p>
            ) : null}
            {card.ratingText && !isFeatured ? (
              <span {...uiAttributes({ uid: "product-card.product-card.span-jQSE9E", id: "product-card.product-card.span", instance: ui.instance })} className="inline-flex min-w-0 items-center gap-1 break-words text-[10px] text-tertiary">
                <Star className="h-3 w-3 fill-current" />
                {card.ratingText}
              </span>
            ) : null}
          </div>
          {card.badges.length > 0 && !isFeatured ? (
            <div {...uiAttributes({ uid: "product-card.product-card.div.4-6QwWIe", id: "product-card.product-card.div.4", instance: ui.instance })} className="flex min-w-0 flex-wrap gap-1 pt-1">
              {card.badges.map((badge, badgeIndex) => (
                <span
                  key={badge.label}
                  {...uiAttributes({
                    uid: "product-card.product-card.span.2-B5u0sa",
                    id: "product-card.product-card.span.2",
                    instance: composeUiInstanceId(ui.instance, createUiPositionInstanceId("badge-slot", badgeIndex)),
                  })}
                  className={`min-w-0 break-words rounded-full px-1.5 py-0.5 text-[10px] font-medium ${badgeClass(badge.tone)}`}
                >
                  {badge.label}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </button>
      {hasActions ? (
        <div {...uiAttributes({ uid: "product-card.product-card.div.5-y7CZ4z", id: "product-card.product-card.div.5", instance: ui.instance })}
          className="grid gap-1 border-t border-outline-variant/50 p-1"
          style={{ gridTemplateColumns: `repeat(${actions.length}, minmax(0, 1fr))` }}
        >
          {actions.map((action, actionIndex) => (
            <button
              key={`${action.kind}-${action.label}`}
              {...uiAttributes({
                uid: "product-card.product-card.button-tI5CQJ",
                id: "product-card.product-card.button",
                instance: composeUiInstanceId(ui.instance, createUiPositionInstanceId("action-slot", actionIndex)),
              })}
              type="button"
              disabled={action.disabled}
              aria-pressed={action.kind === "toggleFeatured" ? Boolean(action.active) : undefined}
              onClick={action.onClick}
              className={`flex h-8 items-center justify-center transition disabled:opacity-50 ${
                action.kind === "toggleFeatured" && action.active
                  ? "rounded-full ring-2 ring-tertiary/30"
                  : "rounded-md"
              } ${actionClass(action)}`}
              aria-label={action.label}
            >
              {action.kind === "toggleFeatured" ? (
                <Star className={`h-4 w-4 ${action.active ? "fill-current" : ""}`} />
              ) : (
                actionIcon(action.kind)
              )}
            </button>
          ))}
        </div>
      ) : null}
    </article>
  );
}
