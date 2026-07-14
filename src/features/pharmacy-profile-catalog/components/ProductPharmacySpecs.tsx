"use client";

import { useEffect, useMemo, useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProductDetails } from "@/features/product/entities/product.entity";
import { pharmacyStaticCatalogService } from "../services/pharmacy-static-catalog.service";
import { pharmacyProfileCatalogApi } from "../services/pharmacy-profile-catalog-api";
import type {
  PharmacyProfileCatalogCategoryView,
  PharmacyProfileCatalogSubcategoryView,
  PharmacyProfileCatalogView,
} from "../entities/pharmacy-profile-catalog.types";
import { ProductField } from "@/components/product/ProductComponentPrimitives";
import type {
  ProductComponentConfig,
  ProductMode,
} from "@/components/product/product-component.types";

interface ProductPharmacySpecsProps {
  mode: ProductMode;
  config: ProductComponentConfig;
  details: ProductDetails;
  ownerUid?: string;
  onChange: (details: ProductDetails) => void;
}

export function ProductPharmacySpecs({
  mode,
  config,
  details,
  ownerUid = "",
  onChange,
}: ProductPharmacySpecsProps) {
  const [profileCatalog, setProfileCatalog] =
    useState<PharmacyProfileCatalogView | null>(null);
  const specs = details.pharmacySpecs;

  useEffect(() => {
    let cancelled = false;
    if (!ownerUid) {
      setProfileCatalog(null);
      return;
    }
    pharmacyProfileCatalogApi
      .list(ownerUid, false)
      .then((catalog) => {
        if (!cancelled) setProfileCatalog(catalog);
      })
      .catch(() => {
        if (!cancelled) setProfileCatalog(null);
      });
    return () => {
      cancelled = true;
    };
  }, [ownerUid]);

  const categories = useMemo<PharmacyProfileCatalogCategoryView[]>(
    () =>
      profileCatalog?.categories ??
      pharmacyStaticCatalogService.getCategories().map((category) => ({
        id: String(category.id),
        fixedCategoryId: category.id,
        nameAr: category.nameAr,
        nameEn: category.nameEn,
        icon: category.icon,
        status: "visible",
        sortOrder: category.id,
        isCustom: false,
      })),
    [profileCatalog?.categories],
  );
  const selectedCategory =
    categories.find(
      (category) =>
        category.id === specs.pharmacyCategoryId ||
        category.nameAr === specs.pharmacyCategory,
    ) ?? categories[0];

  const subcategories = useMemo<PharmacyProfileCatalogSubcategoryView[]>(
    () => {
      if (!selectedCategory) return [];
      if (profileCatalog) {
        return profileCatalog.subcategories.filter(
          (subcategory) => subcategory.parentCategoryId === selectedCategory.id,
        );
      }
      const fixedCategoryId =
        selectedCategory.fixedCategoryId ?? Number(selectedCategory.id);
      return pharmacyStaticCatalogService
        .getSubcategories(fixedCategoryId)
        .map((subcategory) => ({
          id: String(subcategory.id),
          fixedSubcategoryId: subcategory.id,
          parentCategoryId: String(subcategory.categoryId),
          nameAr: subcategory.nameAr,
          nameEn: subcategory.nameEn,
          status: "visible",
          sortOrder: subcategory.id,
          isCustom: false,
        }));
    },
    [profileCatalog, selectedCategory],
  );
  const selectedSubcategory =
    subcategories.find(
      (subcategory) =>
        subcategory.id === specs.pharmacySubcategoryId ||
        subcategory.nameAr === specs.pharmacySubcategory,
    ) ?? subcategories[0];

  const forms = useMemo(() => pharmacyStaticCatalogService.getForms(), []);
  const selectedForm =
    forms.find(
      (form) => form.id === specs.formId || form.nameAr === specs.form,
    ) ?? forms[0];

  const strengths = useMemo(
    () => pharmacyStaticCatalogService.getStrengths(),
    [],
  );
  const selectedStrength =
    strengths.find(
      (strength) =>
        strength.id === specs.concentrationId ||
        strength.value === specs.concentration,
    ) ?? strengths[0];

  function patch(next: Partial<ProductDetails["pharmacySpecs"]>) {
    const pharmacySpecs = { ...details.pharmacySpecs, ...next };
    onChange({ ...details, pharmacySpecs });
  }

  function patchCatalog(next: Partial<ProductDetails["pharmacyCatalog"]>) {
    onChange({
      ...details,
      pharmacyCatalog: { ...details.pharmacyCatalog, ...next },
    });
  }

  function selectCategory(categoryId: string) {
    const category = categories.find((item) => item.id === categoryId);
    const firstSubcategory = category
      ? (
          profileCatalog?.subcategories.filter(
            (item) => item.parentCategoryId === category.id,
          ) ??
          pharmacyStaticCatalogService
            .getSubcategories(category.fixedCategoryId ?? Number(category.id))
            .map((subcategory) => ({
              id: String(subcategory.id),
              fixedSubcategoryId: subcategory.id,
              parentCategoryId: String(subcategory.categoryId),
              nameAr: subcategory.nameAr,
              nameEn: subcategory.nameEn,
              status: "visible" as const,
              sortOrder: subcategory.id,
              isCustom: false,
            }))
        )[0]
      : undefined;
    const firstActiveIngredient = firstSubcategory
      ? pharmacyStaticCatalogService.getActiveIngredients(
          firstSubcategory.fixedSubcategoryId ?? -1,
        )[0]
      : undefined;
    const firstForm = pharmacyStaticCatalogService.getForms()[0];
    const firstStrength = pharmacyStaticCatalogService.getStrengths()[0];

    onChange({
      ...details,
      pharmacyCatalog: {
        ...details.pharmacyCatalog,
        categoryId: category?.id ?? "",
        categoryNameAr: category?.nameAr ?? "",
        categoryNameEn: category?.nameEn ?? "",
        subcategoryId: firstSubcategory?.id ?? "",
        subcategoryNameAr: firstSubcategory?.nameAr ?? "",
        subcategoryNameEn: firstSubcategory?.nameEn ?? "",
      },
      pharmacySpecs: {
        ...details.pharmacySpecs,
        pharmacyCategoryId: category?.id ?? "",
        pharmacyCategory: category?.nameAr ?? "",
        pharmacySubcategoryId: firstSubcategory?.id ?? "",
        pharmacySubcategory: firstSubcategory?.nameAr ?? "",
        activeIngredientId: firstActiveIngredient
          ? String(firstActiveIngredient.id)
          : "",
        activeIngredient: firstActiveIngredient?.nameAr ?? "",
        formId: firstForm?.id ?? "",
        form: firstForm?.nameAr ?? "",
        concentrationId: firstStrength?.id ?? "",
        concentration: firstStrength?.value ?? "",
        prescriptionRequired:
          firstActiveIngredient?.prescriptionRequired ?? false,
      },
    });
  }

  function selectSubcategory(subcategoryId: string) {
    const subcategory = subcategories.find(
      (item) => item.id === subcategoryId,
    );
    const firstActiveIngredient = subcategory
      ? pharmacyStaticCatalogService.getActiveIngredients(
          subcategory.fixedSubcategoryId ?? -1,
        )[0]
      : undefined;
    const firstForm = pharmacyStaticCatalogService.getForms()[0];
    const firstStrength = pharmacyStaticCatalogService.getStrengths()[0];

    patchCatalog({
      subcategoryId: subcategory?.id ?? "",
      subcategoryNameAr: subcategory?.nameAr ?? "",
      subcategoryNameEn: subcategory?.nameEn ?? "",
    });
    patch({
      pharmacySubcategoryId: subcategory?.id ?? "",
      pharmacySubcategory: subcategory?.nameAr ?? "",
      activeIngredientId: firstActiveIngredient
        ? String(firstActiveIngredient.id)
        : "",
      activeIngredient: firstActiveIngredient?.nameAr ?? "",
      formId: firstForm?.id ?? "",
      form: firstForm?.nameAr ?? "",
      concentrationId: firstStrength?.id ?? "",
      concentration: firstStrength?.value ?? "",
      prescriptionRequired: firstActiveIngredient?.prescriptionRequired ?? false,
    });
  }

  function selectForm(formId: string) {
    const form = forms.find((item) => item.id === formId);
    patch({ formId: form?.id ?? "", form: form?.nameAr ?? "" });
  }

  function selectStrength(strengthId: string) {
    const strength = strengths.find((item) => item.id === strengthId);
    patch({
      concentrationId: strength?.id ?? "",
      concentration: strength?.value ?? "",
    });
  }

  const noop = () => {};

  if (mode === "view") {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {config.pharmacyCategory ? (
          <ProductField
            label="التصنيف الرئيسي"
            value={specs.pharmacyCategory}
            mode={mode}
            onChange={noop}
          />
        ) : null}
        {config.pharmacySubcategory ? (
          <ProductField
            label="التصنيف الفرعي"
            value={specs.pharmacySubcategory}
            mode={mode}
            onChange={noop}
          />
        ) : null}
        {config.nameAr ? (
          <ProductField
            label="الاسم بالعربي"
            value={specs.nameAr}
            mode={mode}
            onChange={noop}
          />
        ) : null}
        {config.nameEn ? (
          <ProductField
            label="الاسم بالإنجليزي"
            value={specs.nameEn}
            mode={mode}
            onChange={noop}
          />
        ) : null}
        {config.activeIngredient ? (
          <ProductField
            label="المادة الفعالة"
            value={specs.activeIngredient}
            mode={mode}
            onChange={noop}
          />
        ) : null}
        {config.form ? (
          <ProductField
            label="شكل الدواء"
            value={specs.form}
            mode={mode}
            onChange={noop}
          />
        ) : null}
        {config.concentration ? (
          <ProductField
            label="التركيز"
            value={specs.concentration}
            mode={mode}
            onChange={noop}
          />
        ) : null}
        {config.prescriptionRequired ? (
          <ProductField
            label="يتطلب روشتة"
            value={String(specs.prescriptionRequired)}
            mode={mode}
            type="boolean"
            onChange={noop}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {config.pharmacyCategory ? (
        <PharmacySelect
          label="التصنيف الرئيسي"
          value={selectedCategory ? String(selectedCategory.id) : ""}
          disabled={categories.length === 0}
          placeholder="اختر التصنيف الرئيسي"
          options={categories.map((category) => ({
            value: String(category.id),
            label: category.nameAr,
          }))}
          onChange={selectCategory}
        />
      ) : null}
      {config.pharmacySubcategory ? (
        <PharmacySelect
          label="التصنيف الفرعي"
          value={selectedSubcategory ? String(selectedSubcategory.id) : ""}
          disabled={subcategories.length === 0}
          placeholder="اختر التصنيف الفرعي"
          options={subcategories.map((subcategory) => ({
            value: String(subcategory.id),
            label: subcategory.nameAr,
          }))}
          onChange={selectSubcategory}
        />
      ) : null}
      {config.nameAr ? (
        <ProductField
          label="الاسم بالعربي"
          value={specs.nameAr}
          mode={mode}
          onChange={(value) => patch({ nameAr: value })}
        />
      ) : null}
      {config.nameEn ? (
        <ProductField
          label="الاسم بالإنجليزي"
          value={specs.nameEn}
          mode={mode}
          onChange={(value) => patch({ nameEn: value })}
        />
      ) : null}
      {config.activeIngredient ? (
        <ProductField
          label="المادة الفعالة"
          value={specs.activeIngredient}
          mode={mode}
          onChange={(value) =>
            patch({ activeIngredientId: "", activeIngredient: value })
          }
        />
      ) : null}
      {config.form ? (
        <PharmacySelect
          label="شكل الدواء"
          value={selectedForm?.id ?? ""}
          disabled={forms.length === 0}
          placeholder="اختر شكل الدواء"
          options={forms.map((form) => ({
            value: form.id,
            label: form.nameAr,
          }))}
          onChange={selectForm}
        />
      ) : null}
      {config.concentration ? (
        <PharmacySelect
          label="التركيز"
          value={selectedStrength?.id ?? ""}
          disabled={strengths.length === 0}
          placeholder="اختر التركيز"
          options={strengths.map((strength) => ({
            value: strength.id,
            label: strength.value,
          }))}
          onChange={selectStrength}
        />
      ) : null}
      {config.prescriptionRequired ? (
        <ProductField
          label="يتطلب روشتة"
          value={String(specs.prescriptionRequired)}
          mode={mode}
          type="boolean"
          onChange={(value) => patch({ prescriptionRequired: value === "true" })}
        />
      ) : null}
    </div>
  );
}

function PharmacySelect({
  label,
  value,
  disabled,
  placeholder,
  options,
  onChange,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  placeholder: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1.5 text-sm font-medium">
      <span>{label}</span>
      <Select value={value} disabled={disabled} onValueChange={onChange}>
        <SelectTrigger className="gova-control gova-field-surface w-full border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}
