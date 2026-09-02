"use client";

import * as React from "react";
import { ShoppingCart } from "lucide-react";
import { reportSystemIssue } from "@asol/system-logs-core";
import type { ProductDetails } from "@asol/product-core";

import { addCartItem } from "../application/cart-store";

interface ProductAddToCartButtonProps {
  productId: string;
  sellerId: string;
  product: ProductDetails;
  mainCategoryId: string;
}

function numberValue(value: string) {
  const number = Number(value || "0");
  return Number.isFinite(number) ? number : 0;
}

export function ProductAddToCartButton({
  productId,
  sellerId,
  product,
  mainCategoryId,
}: ProductAddToCartButtonProps & { id?: string }) {
  const [added, setAdded] = React.useState(false);
  const [isAdding, setIsAdding] = React.useState(false);
  const canAdd = Boolean(productId && sellerId);

  const handleAdd = async () => {
    if (!canAdd || isAdding) return;
    setIsAdding(true);
    try {
      await addCartItem({
        productId,
        sellerId,
        name: product.mainData.name || "منتج بدون اسم",
        description: product.mainData.description,
        images: product.images,
        unitPrice: numberValue(product.price.current),
        priceLabel: product.price.label || undefined,
        quantity: 1,
        requiresSpecialVehicle: product.price.needsCar,
        mainCategoryId,
      });
      setAdded(true);
      window.setTimeout(() => setAdded(false), 1400);
    } catch (error) {
      reportSystemIssue({
        feature: "Cart",
        operation: "add-to-cart",
        error,
      });
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <button id="features-cart-presentation-productaddtocartbutton-button-1-cw7net"
      type="button"
      aria-label="إضافة إلى السلة"
      onClick={() => void handleAdd()}
      disabled={!canAdd || isAdding}
      className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 font-semibold text-on-primary transition disabled:opacity-60"
    >
      <ShoppingCart className="h-4 w-4" />
      {added ? "تمت الإضافة" : isAdding ? "جارٍ الإضافة" : "إضافة إلى السلة"}
    </button>
  );
}
