"use client";

import * as React from "react";
import { ShoppingCart } from "lucide-react";

import type { StoredImage } from "@/core/storage/types/stored-image.types";
import { addCartItem } from "@/features/cart/cart-store";
import type { ProductFieldValues } from "@/features/product/entities/product.entity";

interface ProductAddToCartButtonProps {
  productId: string;
  sellerId: string;
  fields: ProductFieldValues;
  images: StoredImage[];
  mainCategoryId: string;
}

function numberField(fields: ProductFieldValues, key: string) {
  const value = Number(fields[key] ?? "0");
  return Number.isFinite(value) ? value : 0;
}

export function ProductAddToCartButton({
  productId,
  sellerId,
  fields,
  images,
  mainCategoryId,
}: ProductAddToCartButtonProps) {
  const [added, setAdded] = React.useState(false);
  const canAdd = Boolean(productId && sellerId);

  const handleAdd = () => {
    if (!canAdd) return;
    addCartItem({
      productId,
      sellerId,
      name: fields["mainData.name"] || "منتج بدون اسم",
      description: fields["mainData.description"] ?? "",
      images,
      unitPrice: numberField(fields, "price.current"),
      priceLabel: fields["price.label"] || undefined,
      quantity: 1,
      requiresSpecialVehicle: fields["price.needsCar"] === "true",
      mainCategoryId,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1400);
  };

  return (
    <button
      type="button"
      onClick={handleAdd}
      disabled={!canAdd}
      className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 font-semibold text-on-primary transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <ShoppingCart className="h-4 w-4" />
      {added ? "تمت الإضافة" : "إضافة إلى السلة"}
    </button>
  );
}
