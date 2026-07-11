"use client";

import * as React from "react";

import {
  CART_CHANGED_EVENT,
  CART_ITEM_ADDED_EVENT,
  getCartItems,
  getCartTotalQuantity,
  type CartItem,
} from "./cart-store";

export function useCart() {
  const [items, setItems] = React.useState<CartItem[]>([]);
  const [flashToken, setFlashToken] = React.useState(0);

  React.useEffect(() => {
    const sync = () => setItems(getCartItems());
    const flash = () => {
      sync();
      setFlashToken((value) => value + 1);
    };

    sync();
    window.addEventListener(CART_CHANGED_EVENT, sync);
    window.addEventListener(CART_ITEM_ADDED_EVENT, flash);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CART_CHANGED_EVENT, sync);
      window.removeEventListener(CART_ITEM_ADDED_EVENT, flash);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return {
    items,
    totalQuantity: getCartTotalQuantity(items),
    flashToken,
  };
}
