"use client";

import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode, RefObject } from "react";
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

type OrderAction3D = {
  key: string;
  node: ReactNode;
};

function circularOffset(index: number, activeIndex: number, count: number) {
  if (count <= 1) return 0;
  let offset = index - activeIndex;
  const half = count / 2;
  if (offset > half) offset -= count;
  if (offset < -half) offset += count;
  return offset;
}

function OrderActions3D({
  id,
  actions,
}: {
  id?: string;
  actions: OrderAction3D[];
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const dragStartX = useRef<number | null>(null);
  const dragged = useRef(false);

  const rotate = (direction: -1 | 1) => {
    if (actions.length <= 1) return;
    setActiveIndex((current) =>
      (current + direction + actions.length) % actions.length,
    );
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragStartX.current = event.clientX;
    dragged.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStartX.current === null) return;
    if (Math.abs(event.clientX - dragStartX.current) > 8) dragged.current = true;
  };

  const finishPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStartX.current === null) return;
    const deltaX = event.clientX - dragStartX.current;
    dragStartX.current = null;
    if (Math.abs(deltaX) >= 36) rotate(deltaX < 0 ? 1 : -1);
    window.setTimeout(() => {
      dragged.current = false;
    }, 0);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <div
      id={id}
      role="group"
      aria-label="إجراءات المنتج"
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishPointer}
      onPointerCancel={(event) => {
        dragStartX.current = null;
        dragged.current = false;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          rotate(1);
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          rotate(-1);
        }
      }}
      className="relative box-border h-[104px] w-full max-w-full min-w-0 touch-pan-y overflow-hidden p-[6px] outline-none"
      style={{ perspective: "900px", perspectiveOrigin: "50% 50%" }}
    >
      {actions.map((action, index) => {
        const offset = circularOffset(index, activeIndex, actions.length);
        const distance = Math.abs(offset);
        const isActive = offset === 0;
        const translateX = offset * 82;
        const translateZ = isActive ? 54 : -distance * 86;
        const rotateY = offset * -42;
        const scale = isActive ? 1 : Math.max(0.72, 0.9 - distance * 0.08);

        return (
          <div
            key={action.key}
            onClickCapture={(event) => {
              if (dragged.current) {
                event.preventDefault();
                event.stopPropagation();
                dragged.current = false;
                return;
              }
              if (!isActive) {
                event.preventDefault();
                event.stopPropagation();
                setActiveIndex(index);
              }
            }}
            className="absolute left-1/2 top-1/2 w-max max-w-none will-change-transform"
            style={{
              transform: `translate(-50%, -50%) translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
              transformStyle: "preserve-3d",
              transformOrigin: "center center",
              transition: "transform 360ms cubic-bezier(0.22, 1, 0.36, 1), opacity 280ms ease, filter 280ms ease",
              zIndex: 50 - distance,
              opacity: isActive ? 1 : Math.max(0.48, 0.86 - distance * 0.14),
              filter: isActive ? "none" : `brightness(${Math.max(0.72, 0.92 - distance * 0.07)})`,
            }}
          >
            {action.node}
          </div>
        );
      })}
    </div>
  );
}

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


export function ProductComponentsRenderer({ id,
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
} & { id?: string }) {
  const visible = Object.entries(components)
    .filter(([, config]) => config.visible)
    .sort(([, a], [, b]) => Number(a.order) - Number(b.order));

  if (visible.length === 0) {
    return (
      <p id={id} className="py-8 text-center text-sm text-muted-foreground">
        لا توجد مكونات مفعلة للعرض.
      </p>
    );
  }

  return (
    <>
      {visible.map(([key, config]) => {
        const sectionId = id ? `${id}-${key}-section-4k2m9x` : undefined;

        if (key === "images") {
          return (
            <ProductComponentFrame
              id={sectionId}
              key={key}
              title={PRODUCT_COMPONENT_TITLES[key]}
              showTitle={false}
            >
              {mode === "view" ? (
                <ProductImageGallery
                  id={id ? `${id}-images-gallery-7g3m1p` : undefined}
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
            <ProductComponentFrame
              id={sectionId}
              key={key}
              title={PRODUCT_COMPONENT_TITLES[key]}
              showTitle={false}
            >
              {mode === "view" ? (
                <ProductReviews
                  id={id ? `${id}-reviews-3h7p2m` : undefined}
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
          const orderActions: OrderAction3D[] = [];

          if (config.cart) {
            orderActions.push({
              key: "cart",
              node: (
                <ProductAddToCartButton
                  id={id ? `${id}-order-cart-button-1c4h8q` : undefined}
                  productId={productId}
                  sellerId={ownerUid}
                  product={product}
                  mainCategoryId={mainCategoryId}
                  className="!h-auto !min-h-0 !w-max !min-w-max max-w-none shrink-0 flex-col justify-center gap-0.5 overflow-visible rounded-xl !border-0 !bg-amber-500 !p-[6px] whitespace-nowrap leading-tight text-center text-xs font-medium !text-white shadow-lg [&>svg]:h-8 [&>svg]:w-8 [&>svg]:!text-white"
                />
              ),
            });
          }
          if (config.favorite && favoriteAction) {
            orderActions.push({ key: "favorite", node: favoriteAction });
          }
          if (config.contact && contactAction) {
            orderActions.push({ key: "contact", node: contactAction });
          }
          if (showShare && shareAction) {
            orderActions.push({ key: "share", node: shareAction });
          }
          if (showProfile && profileAction) {
            orderActions.push({ key: "profile", node: profileAction });
          }

          return (
            <ProductComponentFrame
              id={sectionId}
              key={key}
              title={PRODUCT_COMPONENT_TITLES[key]}
              showTitle={false}
              compactPadding
            >
              <OrderActions3D
                id={id ? `${id}-order-actions-2v6k9s` : undefined}
                actions={orderActions}
              />
            </ProductComponentFrame>
          );
        }

        if (key === "vehicleSpecs") {
          return (
            <ProductComponentFrame id={sectionId} key={key} title={PRODUCT_COMPONENT_TITLES[key]}>
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
            <ProductComponentFrame id={sectionId} key={key} title={PRODUCT_COMPONENT_TITLES[key]}>
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
            <ProductComponentFrame id={sectionId} key={key} title={PRODUCT_COMPONENT_TITLES[key]}>
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

        const fields = PRODUCT_COMPONENT_FIELDS[key] ?? [];
        const visibleFields = fields.filter(([fieldKey]) => config[fieldKey] !== false);
        const primaryFields =
          key === "mainData"
            ? visibleFields.filter(([fieldKey]) => fieldKey !== "description")
            : visibleFields;
        const descriptionField =
          key === "mainData"
            ? visibleFields.find(([fieldKey]) => fieldKey === "description")
            : undefined;

        return (
          <ProductComponentFrame
            id={sectionId}
            key={key}
            title={PRODUCT_COMPONENT_TITLES[key] ?? key}
            showTitle={key !== "price" && key !== "mainData" && key !== "specifications"}
          >
            <div
              id={id ? `${id}-${key}-fields-grid-6c2v8n` : undefined}
              className={
                key === "price"
                  ? "mx-auto grid w-full max-w-2xl grid-flow-col auto-cols-fr justify-center gap-3"
                  : key === "mainData" || key === "specifications"
                    ? "mx-auto grid w-full max-w-2xl grid-flow-col auto-cols-max justify-center gap-3 overflow-x-auto"
                    : "grid gap-3 sm:grid-cols-2"
              }
            >
              {primaryFields.map(([fieldKey, label, kind]) => (
                <ProductField
                  id={id ? `${id}-${key}-${fieldKey}-field-5n8c2r` : undefined}
                  key={`${key}.${fieldKey}`}
                  label={label}
                  value={readValue(product, key, fieldKey)}
                  mode={mode}
                  type={kind}
                  multiline={kind === "textarea"}
                  centered={key === "price" || key === "mainData" || key === "specifications"}
                  blueLabel={key === "price" || key === "mainData" || key === "specifications"}
                  nowrapLabel={key === "mainData"}
                  nowrapValue={key === "mainData"}
                  cardSurface={key === "specifications"}
                  onChange={(value) =>
                    onProductChange(
                      writeValue(product, key, fieldKey, value, kind),
                    )
                  }
                />
              ))}
            </div>
            {descriptionField ? (
              <details
                id={id ? `${id}-mainData-description-card-3g7k2m` : undefined}
                className="mx-auto mt-3 w-full max-w-2xl rounded-xl bg-muted/40"
              >
                <summary
                  id={id ? `${id}-mainData-description-toggle-6p1v8c` : undefined}
                  className="list-none px-3 py-2.5 text-center text-xs font-medium text-blue-600 dark:text-blue-400"
                >
                  {descriptionField[1]}
                </summary>
                <div className="px-3 pb-3">
                  <ProductField
                    id={id ? `${id}-mainData-description-field-5n8c2r` : undefined}
                    label={descriptionField[1]}
                    value={readValue(product, key, descriptionField[0])}
                    mode={mode}
                    type={descriptionField[2]}
                    multiline
                    centered
                    blueLabel
                    hideLabel
                    onChange={(value) =>
                      onProductChange(
                        writeValue(
                          product,
                          key,
                          descriptionField[0],
                          value,
                          descriptionField[2],
                        ),
                      )
                    }
                  />
                </div>
              </details>
            ) : null}
          </ProductComponentFrame>
        );
      })}
    </>
  );
}
