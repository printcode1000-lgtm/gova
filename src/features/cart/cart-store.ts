"use client";

import type { StoredImage } from "@/core/storage/types/stored-image.types";
import { ASOL_DB_STORES, asolDbGet, asolDbSet } from "@/lib/asol-db";

export const CART_STORAGE_KEY = "asol:cart:v1";
export const CART_CHANGED_EVENT = "asol:cart:changed";
export const CART_ITEM_ADDED_EVENT = "asol:cart:item-added";
export const CART_BROADCAST_CHANNEL = "asol:cart:broadcast";

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
  priceLabel?: string;
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
  priceLabel?: string;
  quantity?: number;
  requiresSpecialVehicle?: boolean;
  mainCategoryId?: string;
}

function emitCartChanged(added = false) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CART_CHANGED_EVENT));
  if (added) window.dispatchEvent(new Event(CART_ITEM_ADDED_EVENT));
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel(CART_BROADCAST_CHANNEL);
    channel.postMessage({ added });
    channel.close();
  }
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

let cartMutationQueue: Promise<void> = Promise.resolve();

function enqueueCartMutation<T>(action: () => Promise<T>): Promise<T> {
  const result = cartMutationQueue.then(action, action);
  cartMutationQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

export async function getCartItems(): Promise<CartItem[]> {
  const stored = await asolDbGet<unknown>(ASOL_DB_STORES.CART, CART_STORAGE_KEY);
  return normalizeItems(stored);
}

export function setCartItems(items: CartItem[]): Promise<void> {
  return enqueueCartMutation(async () => {
    const normalized = normalizeItems(items);
    await asolDbSet(ASOL_DB_STORES.CART, CART_STORAGE_KEY, normalized);
    emitCartChanged();
  });
}

export function clearCart(): Promise<void> {
  return setCartItems([]);
}

export function addCartItem(input: AddCartItemInput): Promise<CartItem[]> {
  return enqueueCartMutation(async () => {
    const current = await getCartItems();
    if (!input.productId || !input.sellerId) return current;

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
        priceLabel: input.priceLabel,
        currency: "EGP",
        requiresSpecialVehicle: input.requiresSpecialVehicle === true,
        mainCategoryId: input.mainCategoryId ?? "",
        addedAt: now,
      };
      next = [...current, item];
    }

    await asolDbSet(ASOL_DB_STORES.CART, CART_STORAGE_KEY, next);
    emitCartChanged(true);
    return next;
  });
}

export function updateCartItemQuantity(itemId: string, quantity: number): Promise<void> {
  return enqueueCartMutation(async () => {
    const current = await getCartItems();
    const nextQuantity = Math.max(0, Math.floor(quantity));
    const next =
      nextQuantity === 0
        ? current.filter((item) => item.id !== itemId)
        : current.map((item) =>
            item.id === itemId ? { ...item, quantity: nextQuantity } : item,
          );
    await asolDbSet(ASOL_DB_STORES.CART, CART_STORAGE_KEY, next);
    emitCartChanged();
  });
}

export function removeCartItem(itemId: string): Promise<void> {
  return enqueueCartMutation(async () => {
    const current = await getCartItems();
    const next = current.filter((item) => item.id !== itemId);
    await asolDbSet(ASOL_DB_STORES.CART, CART_STORAGE_KEY, next);
    emitCartChanged();
  });
}

export function getCartTotalQuantity(items: CartItem[] = []) {
  return items.reduce((total, item) => total + item.quantity, 0);
}

export function getCartTotalMinor(items: CartItem[] = []) {
  return items.reduce(
    (total, item) => total + item.unitPriceMinor * item.quantity,
    0,
  );
}
