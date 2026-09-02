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
    <div id='onboarding-presentation-sections-productform-div-1-0rvpg1' className="space-y-6">
      <div id='onboarding-presentation-sections-productform-div-2-d8siya' className="grid gap-6 lg:grid-cols-2">
        <FormField id='onboarding-presentation-sections-productform-formfield-3-skgkuu'
          label={t("onboarding.products.productTitle")}
          htmlFor='onboarding-presentation-sections-productform-forminput-4-nhbben'
          required
          error={errors.title}
        >
          <FormInput
            id='onboarding-presentation-sections-productform-forminput-4-nhbben'
            value={product.title}
            onChange={(event) => onChange({ title: event.target.value })}
            placeholder={t("onboarding.products.titlePlaceholder")}
            error={errors.title}
          />
        </FormField>

        <FormField id='onboarding-presentation-sections-productform-formfield-5-ytwssh'
          label={t("onboarding.products.category")}
          htmlFor="category"
          required
          error={errors.category}
        >
          <FormSelect id='onboarding-presentation-sections-productform-formselect-6-wo4uqr'
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

      <FormField id='onboarding-presentation-sections-productform-formfield-7-ryhqx1'
        label={t("onboarding.products.descriptionLabel")}
        htmlFor='onboarding-presentation-sections-productform-formtextarea-8-eucw0e'
        required
        error={errors.description}
      >
        <FormTextarea
          id='onboarding-presentation-sections-productform-formtextarea-8-eucw0e'
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

      <div id='onboarding-presentation-sections-productform-div-9-yqhyw4' className="grid gap-6 sm:grid-cols-2">
        <FormField id='onboarding-presentation-sections-productform-formfield-10-gbhy6y'
          label={t("onboarding.products.price")}
          htmlFor='onboarding-presentation-sections-productform-forminput-13-ihalpi'
          required
          error={errors.basePrice}
        >
          <div id='onboarding-presentation-sections-productform-div-11-xgcope' className="relative">
            <DollarSign id='onboarding-presentation-sections-productform-dollarsign-12-f18kkv' className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <FormInput
              id='onboarding-presentation-sections-productform-forminput-13-ihalpi'
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

        <FormField id='onboarding-presentation-sections-productform-formfield-14-xauevd'
          label={t("onboarding.products.discountPrice")}
          htmlFor='onboarding-presentation-sections-productform-forminput-17-fjubpp'
          hint={t("onboarding.common.optional")}
        >
          <div id='onboarding-presentation-sections-productform-div-15-wbjgzn' className="relative">
            <DollarSign id='onboarding-presentation-sections-productform-dollarsign-16-k1zl25' className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <FormInput
              id='onboarding-presentation-sections-productform-forminput-17-fjubpp'
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

      <div id='onboarding-presentation-sections-productform-div-18-goxrlf' className="flex items-center justify-between rounded-lg border p-4">
        <div id='onboarding-presentation-sections-productform-div-19-ukygv0'>
          <Label id='onboarding-presentation-sections-productform-label-20-0wjyrn'>{t("onboarding.products.featured")}</Label>
          <p id='onboarding-presentation-sections-productform-text-21-cjvlz4' className="text-sm text-muted-foreground">
            {t("onboarding.products.featuredDesc")}
          </p>
        </div>
        <Switch id='onboarding-presentation-sections-productform-switch-22-58f9yi'
          checked={product.isFeatured}
          onCheckedChange={(checked) => onChange({ isFeatured: checked })}
        />
      </div>

      <div id='onboarding-presentation-sections-productform-div-23-vmcmgb' className="space-y-4">
        <div id='onboarding-presentation-sections-productform-div-24-96gbpy' className="flex items-center justify-between">
          <div id='onboarding-presentation-sections-productform-div-25-o9zmue'>
            <Label id='onboarding-presentation-sections-productform-label-26-uz302o' className="text-base">
              {t("onboarding.products.variants")}
            </Label>
            <p id='onboarding-presentation-sections-productform-text-27-fzjj04' className="text-sm text-muted-foreground">
              {t("onboarding.products.variantsDesc")}
            </p>
          </div>
          <Button id='onboarding-presentation-sections-productform-button-28-oz4ttq' variant="outline" size="sm" onClick={addVariant} className="gap-2">
            <Plus id='onboarding-presentation-sections-productform-plus-29-p7nxka' className="h-4 w-4" />
            {t("onboarding.products.addVariant")}
          </Button>
        </div>

        {product.variants.length > 0 ? (
          <div id='onboarding-presentation-sections-productform-div-30-had7z0' className="space-y-3">
            {product.variants.map((variant, index) => {
              return (
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
                        onChange={(event) => updateVariant(variant.id, { size: event.target.value })}
                        placeholder={t("onboarding.products.sizePlaceholder")}
                      />
                    </FormField>

                    <FormField
                      label={t("onboarding.products.color")}
                      htmlFor={`color-${variant.id}`}
                    >
                      <FormInput
                        value={variant.color}
                        onChange={(event) => updateVariant(variant.id, { color: event.target.value })}
                        placeholder={t("onboarding.products.colorPlaceholder")}
                      />
                    </FormField>

                    <FormField
                      label={t("onboarding.products.material")}
                      htmlFor={`material-${variant.id}`}
                    >
                      <FormInput
                        value={variant.material}
                        onChange={(event) => updateVariant(variant.id, { material: event.target.value })}
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
                        onChange={(event) => updateVariant(variant.id, { inventory: parseInt(event.target.value, 10) || 0 })}
                        min={0}
                      />
                    </FormField>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      <div id='onboarding-presentation-sections-productform-div-31-tpsgth' className="flex justify-end gap-3 border-t pt-4">
        <Button id='onboarding-presentation-sections-productform-button-32-n4iapa' variant="outline" onClick={onCancel}>
          {t("onboarding.common.cancel")}
        </Button>
      </div>
    </div>
  );
}
