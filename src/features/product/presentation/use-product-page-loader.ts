"use client";

import * as React from "react";
import { ApiError, asolApi } from "@/core/api";
import type {
  ProductDetails,
  ProductRecord,
} from "@/features/product";
import {
  createEmptyProductDetails,
  toProductDetails,
} from "@/features/product";
import { productApiService } from "@/features/product/application/services/product-api-service";
import {
  PHARMACY_MAIN_CATEGORY_ID,
  PHARMACY_SUBCATEGORY_ID,
} from "../domain/pharmacy-category.ids";
import { getPharmacyInitialDetailsPort } from "../ports/pharmacy-initial-details.port";
import type { ProductMode } from "./product-component.types";

export interface ProductStyleFile {
  components: import("./product-component.types").ProductStyleComponents;
}

export function useProductPageLoader({
  initialProduct,
  mode,
  productId,
  initialMain,
  initialSub,
  initialPharmacyCategory,
  initialPharmacySubcategory,
  formatApiError,
}: {
  initialProduct: ProductRecord | null;
  mode: ProductMode;
  productId: string;
  initialMain: string;
  initialSub: string;
  initialPharmacyCategory: string;
  initialPharmacySubcategory: string;
  formatApiError: (error: unknown) => string;
}) {
  const [product, setProduct] = React.useState<ProductRecord | null>(
    initialProduct,
  );
  const [style, setStyle] = React.useState<ProductStyleFile | null>(null);
  const [details, setDetails] = React.useState<ProductDetails>(() =>
    initialProduct
      ? toProductDetails(initialProduct)
      : createEmptyProductDetails(),
  );
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const detailsRef = React.useRef(details);

  const updateDetails = React.useCallback((next: ProductDetails) => {
    detailsRef.current = next;
    setDetails(next);
  }, []);

  React.useEffect(() => {
    detailsRef.current = details;
  }, [details]);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        let loadedProduct: ProductRecord | null = null;
        if (mode !== "new") {
          if (!productId) throw new Error("يلزم تحديد المنتج.");
          loadedProduct =
            initialProduct?.id === productId
              ? initialProduct
              : await productApiService.get(productId);
          if (!cancelled) {
            setProduct(loadedProduct);
            setDetails(toProductDetails(loadedProduct));
          }
        } else {
          if (!initialMain || !initialSub)
            throw new Error("يلزم تحديد التصنيف الرئيسي والفرعي.");
          if (!cancelled) {
            setProduct(null);
            setDetails(
              initialMain === PHARMACY_MAIN_CATEGORY_ID &&
                initialSub === PHARMACY_SUBCATEGORY_ID
                ? getPharmacyInitialDetailsPort().createInitialDetails(
                    initialPharmacyCategory,
                    initialPharmacySubcategory,
                  )
                : createEmptyProductDetails(),
            );
          }
        }

        const main = loadedProduct?.mainCategoryId ?? initialMain;
        const sub = loadedProduct?.subcategoryId ?? initialSub;
        let loadedStyle: ProductStyleFile;
        try {
          loadedStyle = await asolApi.getPublicJson<ProductStyleFile>(
            `/product/style/${encodeURIComponent(main)}__${encodeURIComponent(sub)}.json`,
            { suppressErrorLog: true },
          );
        } catch (styleError) {
          if (!(styleError instanceof ApiError) || styleError.status !== 404) {
            console.error(
              "[ProductPage] Failed to load product style.",
              styleError,
            );
            throw styleError;
          }
          loadedStyle = await asolApi.getPublicJson<ProductStyleFile>(
            "/product/style/default.json",
          );
        }
        if (!cancelled) setStyle(loadedStyle);
      } catch (loadError) {
        if (!cancelled) setError(formatApiError(loadError));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [
    initialMain,
    initialPharmacyCategory,
    initialPharmacySubcategory,
    initialSub,
    initialProduct,
    mode,
    productId,
    formatApiError,
  ]);

  return {
    product,
    setProduct,
    style,
    details,
    detailsRef,
    updateDetails,
    loading,
    error,
    setError,
  };
}
