"use client";

import * as React from "react";

import {
  CART_CHANGED_EVENT,
  CART_BROADCAST_CHANNEL,
  CART_ITEM_ADDED_EVENT,
  getCartItems,
  getCartTotalQuantity,
  type CartItem,
} from "./cart-store";

export function useCart() {
  const [items, setItems] = React.useState<CartItem[]>([]);
  const [flashToken, setFlashToken] = React.useState(0);

  React.useEffect(() => {
    let active = true;
    const sync = () => {
      void getCartItems()
        .then((next) => {
          if (active) setItems(next);
        })
        .catch((error) => {
          console.error("[Cart] Failed to read local cart.", error);
        });
    };
    const flash = () => {
      sync();
      setFlashToken((value) => value + 1);
    };

    sync();
    const channel =
      typeof BroadcastChannel !== "undefined"
        ? new BroadcastChannel(CART_BROADCAST_CHANNEL)
        : null;
    channel?.addEventListener("message", sync);
    window.addEventListener(CART_CHANGED_EVENT, sync);
    window.addEventListener(CART_ITEM_ADDED_EVENT, flash);
    return () => {
      active = false;
      channel?.close();
      window.removeEventListener(CART_CHANGED_EVENT, sync);
      window.removeEventListener(CART_ITEM_ADDED_EVENT, flash);
    };
  }, []);

  return {
    items,
    totalQuantity: getCartTotalQuantity(items),
    flashToken,
  };
}
