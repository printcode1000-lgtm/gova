"use client";

import type { StoredImage } from "@/core/storage/types/stored-image.types";

export const CART_STORAGE_KEY = "gova:cart:v1";
export const CART_CHANGED_EVENT = "gova:cart:changed";
export const CART_ITEM_ADDED_EVENT = "gova:cart:item-added";

export interface CartItem {
  id: string;
  productId: string;
  sellerId: string;
  name: string;
  description: string;
  imageUrl: string;
  imageKey: string;
  quantity: number;
  unitPriceMinor: number;
  currency: "EGP";
  requiresSpecialVehicle: boolean;
  mainCategoryId: string;
  addedAt: string;
}

export interface AddCartItemInput {
  productId: string;
  sellerId: string;
  name: string;
  description?: string;
  images?: StoredImage[];
  unitPrice: number;
  quantity?: number;
  requiresSpecialVehicle?: boolean;
  mainCategoryId?: string;
}

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function emitCartChanged(added = false) {
  window.dispatchEvent(new Event(CART_CHANGED_EVENT));
  if (added) window.dispatchEvent(new Event(CART_ITEM_ADDED_EVENT));
}

function normalizeItems(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is CartItem => {
      const candidate = item as Partial<CartItem>;
      return (
        typeof candidate.id === "string" &&
        typeof candidate.productId === "string" &&
        typeof candidate.sellerId === "string" &&
        typeof candidate.name === "string" &&
        typeof candidate.quantity === "number" &&
        Number.isInteger(candidate.quantity) &&
        candidate.quantity > 0 &&
        typeof candidate.unitPriceMinor === "number" &&
        Number.isInteger(candidate.unitPriceMinor) &&
        candidate.unitPriceMinor >= 0
      );
    })
    .map((item) => ({ ...item, currency: "EGP" as const }));
}

export function getCartItems(): CartItem[] {
  if (!canUseStorage()) return [];
  try {
    return normalizeItems(JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) ?? "[]"));
  } catch {
    return [];
  }
}

export function setCartItems(items: CartItem[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  emitCartChanged();
}

export function clearCart() {
  setCartItems([]);
}

export function addCartItem(input: AddCartItemInput): CartItem[] {
  if (!canUseStorage() || !input.productId || !input.sellerId) return getCartItems();
  const current = getCartItems();
  const quantity = Math.max(1, Math.floor(input.quantity ?? 1));
  const unitPriceMinor = Math.max(0, Math.round(input.unitPrice * 100));
  const existingIndex = current.findIndex(
    (item) => item.productId === input.productId && item.sellerId === input.sellerId,
  );

  const firstImage = input.images?.find((image) => image.url) ?? null;
  const now = new Date().toISOString();

  let next: CartItem[];
  if (existingIndex >= 0) {
    next = current.map((item, index) =>
      index === existingIndex
        ? { ...item, quantity: item.quantity + quantity, addedAt: now }
        : item,
    );
  } else {
    const item: CartItem = {
      id: `${input.productId}:${input.sellerId}`,
      productId: input.productId,
      sellerId: input.sellerId,
      name: input.name || "منتج بدون اسم",
      description: input.description ?? "",
      imageUrl: firstImage?.url ?? "",
      imageKey: firstImage?.imageKey ?? "",
      quantity,
      unitPriceMinor,
      currency: "EGP",
      requiresSpecialVehicle: input.requiresSpecialVehicle === true,
      mainCategoryId: input.mainCategoryId ?? "",
      addedAt: now,
    };
    next = [...current, item];
  }

  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(next));
  emitCartChanged(true);
  return next;
}

export function updateCartItemQuantity(itemId: string, quantity: number) {
  const nextQuantity = Math.max(0, Math.floor(quantity));
  const next =
    nextQuantity === 0
      ? getCartItems().filter((item) => item.id !== itemId)
      : getCartItems().map((item) =>
          item.id === itemId ? { ...item, quantity: nextQuantity } : item,
        );
  setCartItems(next);
}

export function removeCartItem(itemId: string) {
  setCartItems(getCartItems().filter((item) => item.id !== itemId));
}

export function getCartTotalQuantity(items = getCartItems()) {
  return items.reduce((total, item) => total + item.quantity, 0);
}

export function getCartTotalMinor(items = getCartItems()) {
  return items.reduce(
    (total, item) => total + item.unitPriceMinor * item.quantity,
    0,
  );
}
