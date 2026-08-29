"use client";

import * as React from "react";
import { DollarSign, Plus, X } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";
import { StorageImageManager } from "@/features/storage/ui";
import { useTranslation } from "@/shared/i18n";
import { useOnboardingStore } from "@/features/onboarding/domain";
import type { Product, ProductVariant } from "@/features/onboarding/domain/types";
import { nextSellerId } from "@/features/onboarding/domain/next-id";
import { resolveProductStorageProfileId } from "@asol/storage-core";
import {
  FormField,
  FormInput,
  FormSelect,
  FormTextarea,
} from "../form-components";
import { uiAttributes } from "@asol/ui-registry-core";

interface ProductFormProps {
  product: Product;
  onChange: (product: Partial<Product>) => void;
  onCancel: () => void;
}

export function ProductForm({
  product,
  onChange,
  onCancel,
}: ProductFormProps) {
  const { t } = useTranslation();
  const { data: storeData } = useOnboardingStore();
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const categories = storeData.categories.selectedCategories.filter(
    (category) => category.isSelected,
  );

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!product.title.trim()) {
      newErrors.title = t("onboarding.products.errors.titleRequired");
    }
    if (!product.description.trim()) {
      newErrors.description = t(
        "onboarding.products.errors.descriptionRequired",
      );
    }
    if (!product.category) {
      newErrors.category = t("onboarding.products.errors.categoryRequired");
    }
    if (product.basePrice <= 0) {
      newErrors.basePrice = t("onboarding.products.errors.priceRequired");
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const addVariant = () => {
    const variant: ProductVariant = {
      id: nextSellerId("var"),
      sku: "",
      size: "",
      color: "",
      material: "",
      price: product.basePrice,
      discountPrice: null,
      inventory: 0,
      images: [],
    };
    onChange({ variants: [...product.variants, variant] });
  };

  const updateVariant = (id: string, updates: Partial<ProductVariant>) => {
    onChange({
      variants: product.variants.map((variant) =>
        variant.id === id ? { ...variant, ...updates } : variant,
      ),
    });
  };

  const removeVariant = (id: string) => {
    onChange({ variants: product.variants.filter((variant) => variant.id !== id) });
  };

  return (
    <div {...uiAttributes({ uid: "onboarding.sections.product-form.div.13-2I2T6J", id: "onboarding.sections.product-form.div.13" })} id="onboarding.sections.product-form.div" className="space-y-6">
      <div {...uiAttributes({ uid: "onboarding.sections.product-form.div.14-XjQ7cZ", id: "onboarding.sections.product-form.div.14" })} id="onboarding.sections.product-form.div.2" className="grid gap-6 lg:grid-cols-2">
        <FormField id="onboarding.sections.product-form.form-field"
          label={t("onboarding.products.productTitle")}
          htmlFor="title"
          required
          error={errors.title}
        >
          <FormInput ui={{ uid: "onboarding.product-form.title-6kY8Ue", id: "onboarding.product-form.title", kind: "field", part: "form" }}
            id="title"
            value={product.title}
            onChange={(event) => onChange({ title: event.target.value })}
            placeholder={t("onboarding.products.titlePlaceholder")}
            error={errors.title}
          />
        </FormField>

        <FormField id="onboarding.sections.product-form.form-field.2"
          label={t("onboarding.products.category")}
          htmlFor="category"
          required
          error={errors.category}
        >
          <FormSelect id="onboarding.sections.product-form.form-select" ui={{ uid: "onboarding.product-form.category-kstVM4", id: "onboarding.product-form.category", kind: "field", part: "form" }}
            value={product.category}
            onValueChange={(value) => onChange({ category: value })}
            options={categories.map((category) => ({
              value: category.name,
              label: t(`onboarding.constants.fashionCategories.${category.id}`),
            }))}
            placeholder={t("onboarding.products.selectCategory")}
            error={errors.category}
          />
        </FormField>
      </div>

      <FormField id="onboarding.sections.product-form.form-field.3"
        label={t("onboarding.products.descriptionLabel")}
        htmlFor="description"
        required
        error={errors.description}
      >
        <FormTextarea ui={{ uid: "onboarding.product-form.description-cRPL2S", id: "onboarding.product-form.description", kind: "field", part: "form" }}
          id="description"
          value={product.description}
          onChange={(event) => onChange({ description: event.target.value })}
          placeholder={t("onboarding.products.descriptionPlaceholder")}
          rows={4}
          error={errors.description}
        />
      </FormField>

      <StorageImageManager
        config={{
          id: "onboarding-product-image",
          storageProfileId: resolveProductStorageProfileId(
            categories.find(
              (category) => category.name === product.category,
            )?.id,
          ),
          storageScope: categories.find(
            (category) => category.name === product.category,
          )?.id,
          maxItems: 1,
          aspectRatio: "square",
          allowReplace: true,
        }}
        value={
          product.image?.url ||
          product.image?.isUploading ||
          product.image?.error
            ? [
                {
                  imageKey: product.image.imageKey ?? "",
                  url: product.image.url,
                  storageProfileId: product.image.storageProfileId,
                  isUploading: product.image.isUploading,
                  error: product.image.error,
                },
              ]
            : []
        }
        onChange={(images) => {
          const uploaded = images[0] ?? null;
          if (!uploaded) {
            onChange({ image: null });
            return;
          }
          const scopeId = categories.find(
            (category) => category.name === product.category,
          )?.id;
          onChange({
            image: {
              ...uploaded,
              storageProfileId:
                uploaded.storageProfileId ??
                resolveProductStorageProfileId(scopeId),
            },
          });
        }}
        label={t("onboarding.products.productImage")}
      />

      <div {...uiAttributes({ uid: "onboarding.sections.product-form.div.15-s8JArM", id: "onboarding.sections.product-form.div.15" })} id="onboarding.sections.product-form.div.3" className="grid gap-6 sm:grid-cols-2">
        <FormField id="onboarding.sections.product-form.form-field.4"
          label={t("onboarding.products.price")}
          htmlFor="basePrice"
          required
          error={errors.basePrice}
        >
          <div {...uiAttributes({ uid: "onboarding.sections.product-form.div.16-OLy9IH", id: "onboarding.sections.product-form.div.16" })} id="onboarding.sections.product-form.div.4" className="relative">
            <DollarSign id="onboarding.sections.product-form.dollar-sign" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <FormInput ui={{ uid: "onboarding.product-form.base-price-4GFs92", id: "onboarding.product-form.base-price", kind: "field", part: "form" }}
              id="basePrice"
              type="number"
              value={product.basePrice || ""}
              onChange={(event) =>
                onChange({ basePrice: parseFloat(event.target.value) || 0 })
              }
              className="pl-9"
              min={0}
              step={0.01}
              error={errors.basePrice}
            />
          </div>
        </FormField>

        <FormField id="onboarding.sections.product-form.form-field.5"
          label={t("onboarding.products.discountPrice")}
          htmlFor="discountPrice"
          hint={t("onboarding.common.optional")}
        >
          <div {...uiAttributes({ uid: "onboarding.sections.product-form.div.17-7DK33Y", id: "onboarding.sections.product-form.div.17" })} id="onboarding.sections.product-form.div.5" className="relative">
            <DollarSign id="onboarding.sections.product-form.dollar-sign.2" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <FormInput ui={{ uid: "onboarding.product-form.discount-price-QiIE71", id: "onboarding.product-form.discount-price", kind: "field", part: "form" }}
              id="discountPrice"
              type="number"
              value={product.discountPrice || ""}
              onChange={(event) =>
                onChange({
                  discountPrice: parseFloat(event.target.value) || null,
                })
              }
              className="pl-9"
              placeholder={t("onboarding.products.salePrice")}
              min={0}
              step={0.01}
            />
          </div>
        </FormField>
      </div>

      <div {...uiAttributes({ uid: "onboarding.sections.product-form.div.18-46m1HI", id: "onboarding.sections.product-form.div.18" })} id="onboarding.sections.product-form.div.6" className="flex items-center justify-between rounded-lg border p-4">
        <div {...uiAttributes({ uid: "onboarding.sections.product-form.div.19-5iZRim", id: "onboarding.sections.product-form.div.19" })} id="onboarding.sections.product-form.div.7">
          <Label id="onboarding.sections.product-form.label">{t("onboarding.products.featured")}</Label>
          <p {...uiAttributes({ uid: "onboarding.sections.product-form.p.3-a6InX1", id: "onboarding.sections.product-form.p.3" })} id="onboarding.sections.product-form.p" className="text-sm text-muted-foreground">
            {t("onboarding.products.featuredDesc")}
          </p>
        </div>
        <Switch id="onboarding.sections.product-form.switch" ui={{ uid: "onboarding.product-form.featured-7cmVoD", id: "onboarding.product-form.featured", kind: "field", action: "toggle-featured", part: "form" }}
          checked={product.isFeatured}
          onCheckedChange={(checked) => onChange({ isFeatured: checked })}
        />
      </div>

      <div {...uiAttributes({ uid: "onboarding.sections.product-form.div.20-c8EWrE", id: "onboarding.sections.product-form.div.20" })} id="onboarding.sections.product-form.div.8" className="space-y-4">
        <div {...uiAttributes({ uid: "onboarding.sections.product-form.div.21-9uDFe9", id: "onboarding.sections.product-form.div.21" })} id="onboarding.sections.product-form.div.9" className="flex items-center justify-between">
          <div {...uiAttributes({ uid: "onboarding.sections.product-form.div.22-838IP1", id: "onboarding.sections.product-form.div.22" })} id="onboarding.sections.product-form.div.10">
            <Label id="onboarding.sections.product-form.label.2" className="text-base">
              {t("onboarding.products.variants")}
            </Label>
            <p {...uiAttributes({ uid: "onboarding.sections.product-form.p.4-5bB1E6", id: "onboarding.sections.product-form.p.4" })} id="onboarding.sections.product-form.p.2" className="text-sm text-muted-foreground">
              {t("onboarding.products.variantsDesc")}
            </p>
          </div>
          <Button id="onboarding.sections.product-form.button" ui={{ uid: "onboarding.product-form.add-variant-z4UvRP", id: "onboarding.product-form.add-variant", kind: "action", action: "add-variant", part: "variants" }} variant="outline" size="sm" onClick={addVariant} className="gap-2">
            <Plus id="onboarding.sections.product-form.plus" className="h-4 w-4" />
            {t("onboarding.products.addVariant")}
          </Button>
        </div>

        {product.variants.length > 0 ? (
          <div {...uiAttributes({ uid: "onboarding.sections.product-form.div.23-0xKLWP", id: "onboarding.sections.product-form.div.23" })} id="onboarding.sections.product-form.div.11" className="space-y-3">
            {product.variants.map((variant, index) => (
              <div key={variant.id} {...uiAttributes({ uid: "onboarding.sections.product-form.div.24-X0XHa1", id: "onboarding.sections.product-form.div.24" })} className="space-y-4 rounded-lg border p-4">
                <div {...uiAttributes({ uid: "onboarding.sections.product-form.div.25-jK3r1X", id: "onboarding.sections.product-form.div.25" })} className="flex items-center justify-between">
                  <span {...uiAttributes({ uid: "onboarding.sections.product-form.span-ywydT2", id: "onboarding.sections.product-form.span" })} className="text-sm font-medium">
                    {t("onboarding.products.variant", { index: index + 1 })}
                  </span>
                  <Button ui={{ uid: "onboarding.sections.product-form.button.3-WBh20D", id: "onboarding.sections.product-form.button.3" }}
                    variant="ghost"
                    size="icon"
                    onClick={() => removeVariant(variant.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div {...uiAttributes({ uid: "onboarding.sections.product-form.div.26-3D32mR", id: "onboarding.sections.product-form.div.26" })} className="grid gap-4 sm:grid-cols-4">
                  <FormField
                    label={t("onboarding.products.size")}
                    htmlFor={`size-${variant.id}`}
                  >
                    <FormInput
                      value={variant.size}
                      onChange={(event) =>
                        updateVariant(variant.id, { size: event.target.value })
                      }
                      placeholder={t("onboarding.products.sizePlaceholder")}
                    />
                  </FormField>

                  <FormField
                    label={t("onboarding.products.color")}
                    htmlFor={`color-${variant.id}`}
                  >
                    <FormInput
                      value={variant.color}
                      onChange={(event) =>
                        updateVariant(variant.id, { color: event.target.value })
                      }
                      placeholder={t("onboarding.products.colorPlaceholder")}
                    />
                  </FormField>

                  <FormField
                    label={t("onboarding.products.material")}
                    htmlFor={`material-${variant.id}`}
                  >
                    <FormInput
                      value={variant.material}
                      onChange={(event) =>
                        updateVariant(variant.id, {
                          material: event.target.value,
                        })
                      }
                      placeholder={t("onboarding.products.materialPlaceholder")}
                    />
                  </FormField>

                  <FormField
                    label={t("onboarding.products.inventory")}
                    htmlFor={`inv-${variant.id}`}
                  >
                    <FormInput
                      type="number"
                      value={variant.inventory}
                      onChange={(event) =>
                        updateVariant(variant.id, {
                          inventory: parseInt(event.target.value, 10) || 0,
                        })
                      }
                      min={0}
                    />
                  </FormField>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div {...uiAttributes({ uid: "onboarding.sections.product-form.div.27-D06zE3", id: "onboarding.sections.product-form.div.27" })} id="onboarding.sections.product-form.div.12" className="flex justify-end gap-3 border-t pt-4">
        <Button id="onboarding.sections.product-form.button.2" ui={{ uid: "onboarding.product-form.cancel-2EF4QD", id: "onboarding.product-form.cancel", kind: "action", action: "cancel", part: "form-footer" }} variant="outline" onClick={onCancel}>
          {t("onboarding.common.cancel")}
        </Button>
      </div>
    </div>
  );
}
