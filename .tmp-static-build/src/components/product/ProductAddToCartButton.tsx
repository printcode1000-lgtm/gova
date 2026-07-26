"use client";

import * as React from "react";
import { ShoppingCart } from "lucide-react";

import { addCartItem } from "@/features/cart/cart-store";
import type { ProductDetails } from "@/features/product/entities/product.entity";

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
}: ProductAddToCartButtonProps) {
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
      console.error("[Cart] Failed to add item.", error);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleAdd()}
      disabled={!canAdd || isAdding}
      className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 font-semibold text-on-primary transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <ShoppingCart className="h-4 w-4" />
      {added ? "تمت الإضافة" : isAdding ? "جارٍ الإضافة" : "إضافة إلى السلة"}
    </button>
  );
}
