"use client";

import type { ReactNode, RefObject } from "react";
import type { ProductDetails } from "@/features/product";
import {
  ProductComponentFrame,
  ProductField,
} from "./ProductComponentPrimitives";
import { ProductAddToCartButton } from "@/features/cart/ui";
import { ProductImageEditors } from "./ProductImageEditors";
import { ProductImageGallery } from "./ProductImageGallery";
import { getPharmacySpecsSlot } from "../ports/pharmacy-specs-slot.port";
import { ProductPropertySpecs } from "./ProductPropertySpecs";
import { ProductRatingSettings } from "./ProductRatingSettings";
import { ProductReviews } from "./ProductReviews";
import type {
  ProductMode,
  ProductStyleComponents,
} from "./product-component.types";
import { ProductVehicleSpecs } from "./ProductVehicleSpecs";
import type { StorageImageManagerHandle } from "@/features/storage/ui";
import {
  PRODUCT_COMPONENT_FIELDS,
  PRODUCT_COMPONENT_TITLES,
  type BasicFieldKind,
} from "./product-components-renderer.config";
export {
  PRODUCT_DEMO_DETAILS,
  PRODUCT_DEMO_IMAGES,
} from "./product-components-demo-data";

function readValue(product: ProductDetails, section: string, key: string) {
  const value = (product as unknown as Record<string, Record<string, unknown>>)[
    section
  ]?.[key];
  return typeof value === "boolean" ? String(value) : String(value ?? "");
}

function writeValue(
  product: ProductDetails,
  section: string,
  key: string,
  value: string,
  kind: BasicFieldKind,
): ProductDetails {
  const currentSection =
    (product as unknown as Record<string, Record<string, unknown>>)[section] ??
    {};
  return {
    ...product,
    [section]: {
      ...currentSection,
      [key]: kind === "boolean" ? value === "true" : value,
    },
  } as ProductDetails;
}

export function ProductComponentsRenderer({
  mode,
  components,
  product,
  onProductChange,
  productId = "",
  ownerUid = "",
  mainCategoryId = "",
  shareAction = null,
  profileAction = null,
  favoriteAction = null,
  contactAction = null,
  imageUploadRef,
  onImagesPendingChange,
}: {
  mode: ProductMode;
  components: ProductStyleComponents;
  product: ProductDetails;
  onProductChange: (product: ProductDetails) => void;
  productId?: string;
  ownerUid?: string;
  mainCategoryId?: string;
  shareAction?: ReactNode;
  profileAction?: ReactNode;
  favoriteAction?: ReactNode;
  contactAction?: ReactNode;
  imageUploadRef?: RefObject<StorageImageManagerHandle | null>;
  onImagesPendingChange?: (pending: boolean) => void;
}) {
  const visible = Object.entries(components)
    .filter(([, config]) => config.visible)
    .sort(([, a], [, b]) => Number(a.order) - Number(b.order));

  if (visible.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        لا توجد مكونات مفعلة للعرض.
      </p>
    );
  }

  return (
    <>
      {visible.map(([key, config]) => {
        if (key === "images") {
          return (
            <ProductComponentFrame key={key} title={PRODUCT_COMPONENT_TITLES[key]}>
              {mode === "view" ? (
                <ProductImageGallery
                  images={product.images.slice(0, Number(config.count || 1))}
                />
              ) : (
                <ProductImageEditors
                  ref={imageUploadRef}
                  maxImages={Number(config.count || 1)}
                  mainCategoryId={mainCategoryId}
                  images={product.images}
                  onChange={(images) => onProductChange({ ...product, images })}
                  onPendingChange={onImagesPendingChange}
                  deferStorageDeletion={mode === "edit"}
                />
              )}
            </ProductComponentFrame>
          );
        }

        if (key === "rating") {
          const savedMode = product.rating.mode;
          const commentsEnabled =
            savedMode === "stars"
              ? false
              : savedMode === "stars-comments"
                ? true
                : config.type === "stars-comments";

          return (
            <ProductComponentFrame key={key} title={PRODUCT_COMPONENT_TITLES[key]}>
              {mode === "view" ? (
                <ProductReviews
                  productId={productId}
                  ownerUid={ownerUid}
                  productName={product.mainData.name || "المنتج أو الخدمة"}
                  reviewsEnabled={product.rating.enabled}
                  targetEnabled={product.rating.targetEnabled}
                  commentsEnabled={commentsEnabled}
                />
              ) : (
                <ProductRatingSettings
                  rating={product.rating}
                  onChange={(rating) => onProductChange({ ...product, rating })}
                />
              )}
            </ProductComponentFrame>
          );
        }

        if (key === "order") {
          if (mode !== "view") return null;
          const showShare = config.share !== false;
          const showProfile = config.profile !== false;
          return (
            <ProductComponentFrame key={key} title={PRODUCT_COMPONENT_TITLES[key]}>
              <div className="flex flex-wrap gap-2">
                {config.cart ? (
                  <ProductAddToCartButton
                    productId={productId}
                    sellerId={ownerUid}
                    product={product}
                    mainCategoryId={mainCategoryId}
                    simulationTargetId="product-add-cart"
                  />
                ) : null}
                {config.favorite ? (
                  favoriteAction
                ) : null}
                {config.contact ? (
                  contactAction
                ) : null}
                {showShare ? shareAction : null}
                {showProfile ? profileAction : null}
              </div>
            </ProductComponentFrame>
          );
        }

        if (key === "vehicleSpecs") {
          return (
            <ProductComponentFrame key={key} title={PRODUCT_COMPONENT_TITLES[key]}>
              <ProductVehicleSpecs
                mode={mode}
                config={config}
                specs={product.vehicleSpecs}
                onChange={(vehicleSpecs) =>
                  onProductChange({ ...product, vehicleSpecs })
                }
              />
            </ProductComponentFrame>
          );
        }

        if (key === "propertySpecs") {
          return (
            <ProductComponentFrame key={key} title={PRODUCT_COMPONENT_TITLES[key]}>
              <ProductPropertySpecs
                mode={mode}
                config={config}
                specs={product.propertySpecs}
                onChange={(propertySpecs) =>
                  onProductChange({ ...product, propertySpecs })
                }
              />
            </ProductComponentFrame>
          );
        }

        if (key === "pharmacySpecs") {
          const PharmacySpecs = getPharmacySpecsSlot();
          return (
            <ProductComponentFrame key={key} title={PRODUCT_COMPONENT_TITLES[key]}>
              {PharmacySpecs({
                mode,
                config,
                details: product,
                ownerUid,
                onChange: onProductChange,
              })}
            </ProductComponentFrame>
          );
        }

        return (
          <ProductComponentFrame key={key} title={PRODUCT_COMPONENT_TITLES[key] ?? key}>
            <div className="grid gap-3 sm:grid-cols-2">
              {(PRODUCT_COMPONENT_FIELDS[key] ?? []).map(([fieldKey, label, kind]) => {
                if (config[fieldKey] === false) return null;
                return (
                  <ProductField
                    key={`${key}.${fieldKey}`}
                    label={label}
                    value={readValue(product, key, fieldKey)}
                    mode={mode}
                    type={kind}
                    multiline={kind === "textarea"}
                    onChange={(value) =>
                      onProductChange(
                        writeValue(product, key, fieldKey, value, kind),
                      )
                    }
                  />
                );
              })}
            </div>
          </ProductComponentFrame>
        );
      })}
    </>
  );
}
