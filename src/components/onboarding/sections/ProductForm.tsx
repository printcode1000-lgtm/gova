"use client";

import * as React from "react";
import { DollarSign, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { StorageImageManager } from "@/features/storage/components/StorageImageManager";
import { useTranslation } from "@/lib/i18n";
import { useOnboardingStore } from "@/lib/onboarding";
import type { Product, ProductVariant } from "@/lib/onboarding/types";
import { nextSellerId } from "@/lib/onboarding/next-id";
import { StorageProfiles } from "@asol/storage-core";
import {
  FormField,
  FormInput,
  FormSelect,
  FormTextarea,
} from "../form-components";

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
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <FormField
          label={t("onboarding.products.productTitle")}
          htmlFor="title"
          required
          error={errors.title}
        >
          <FormInput
            id="title"
            value={product.title}
            onChange={(event) => onChange({ title: event.target.value })}
            placeholder={t("onboarding.products.titlePlaceholder")}
            error={errors.title}
          />
        </FormField>

        <FormField
          label={t("onboarding.products.category")}
          htmlFor="category"
          required
          error={errors.category}
        >
          <FormSelect
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

      <FormField
        label={t("onboarding.products.descriptionLabel")}
        htmlFor="description"
        required
        error={errors.description}
      >
        <FormTextarea
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
          storageProfileId: StorageProfiles.ProductDefault,
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
                  isUploading: product.image.isUploading,
                  error: product.image.error,
                },
              ]
            : []
        }
        onChange={(images) => onChange({ image: images[0] ?? null })}
        label={t("onboarding.products.productImage")}
      />

      <div className="grid gap-6 sm:grid-cols-2">
        <FormField
          label={t("onboarding.products.price")}
          htmlFor="basePrice"
          required
          error={errors.basePrice}
        >
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <FormInput
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

        <FormField
          label={t("onboarding.products.discountPrice")}
          htmlFor="discountPrice"
          hint={t("onboarding.common.optional")}
        >
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <FormInput
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

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <Label>{t("onboarding.products.featured")}</Label>
          <p className="text-sm text-muted-foreground">
            {t("onboarding.products.featuredDesc")}
          </p>
        </div>
        <Switch
          checked={product.isFeatured}
          onCheckedChange={(checked) => onChange({ isFeatured: checked })}
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base">
              {t("onboarding.products.variants")}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t("onboarding.products.variantsDesc")}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={addVariant} className="gap-2">
            <Plus className="h-4 w-4" />
            {t("onboarding.products.addVariant")}
          </Button>
        </div>

        {product.variants.length > 0 ? (
          <div className="space-y-3">
            {product.variants.map((variant, index) => (
              <div key={variant.id} className="space-y-4 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {t("onboarding.products.variant", { index: index + 1 })}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeVariant(variant.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-4">
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

      <div className="flex justify-end gap-3 border-t pt-4">
        <Button variant="outline" onClick={onCancel}>
          {t("onboarding.common.cancel")}
        </Button>
      </div>
    </div>
  );
}
