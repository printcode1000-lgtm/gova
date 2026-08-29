"use client";

import { useEffect, useMemo, useState } from "react";

import type { ProductDetails } from "@asol/product-core";
import { pharmacyStaticCatalogService } from "../application/services/pharmacy-static-catalog.service";
import { pharmacyProfileCatalogApi } from "../application/services/pharmacy-profile-catalog-api";
import type {
  PharmacyProfileCatalogCategoryView,
  PharmacyProfileCatalogSubcategoryView,
  PharmacyProfileCatalogView,
} from "../domain/pharmacy-profile-catalog.types";
import { ProductField } from "@/features/product/ui";
import type {
  ProductComponentConfig,
  ProductMode,
} from "@/features/product/ui";
import { PharmacySelect } from "./PharmacySelect";
import { uiAttributes } from "@asol/ui-registry-core";

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
      <div {...uiAttributes({ uid: "pharmacy-profile-catalog.product-pharmacy-specs.div.3-Hxiku2", id: "pharmacy-profile-catalog.product-pharmacy-specs.div.3" })} id="pharmacy-profile-catalog.product-pharmacy-specs.div" className="grid gap-3 sm:grid-cols-2">
        {config.pharmacyCategory ? (
          <ProductField id="pharmacy-profile-catalog.product-pharmacy-specs.product-field"
            label="التصنيف الرئيسي"
            value={specs.pharmacyCategory}
            mode={mode}
            onChange={noop}
          />
        ) : null}
        {config.pharmacySubcategory ? (
          <ProductField id="pharmacy-profile-catalog.product-pharmacy-specs.product-field.2"
            label="التصنيف الفرعي"
            value={specs.pharmacySubcategory}
            mode={mode}
            onChange={noop}
          />
        ) : null}
        {config.nameAr ? (
          <ProductField id="pharmacy-profile-catalog.product-pharmacy-specs.product-field.3"
            label="الاسم بالعربي"
            value={specs.nameAr}
            mode={mode}
            onChange={noop}
          />
        ) : null}
        {config.nameEn ? (
          <ProductField id="pharmacy-profile-catalog.product-pharmacy-specs.product-field.4"
            label="الاسم بالإنجليزي"
            value={specs.nameEn}
            mode={mode}
            onChange={noop}
          />
        ) : null}
        {config.activeIngredient ? (
          <ProductField id="pharmacy-profile-catalog.product-pharmacy-specs.product-field.5"
            label="المادة الفعالة"
            value={specs.activeIngredient}
            mode={mode}
            onChange={noop}
          />
        ) : null}
        {config.form ? (
          <ProductField id="pharmacy-profile-catalog.product-pharmacy-specs.product-field.6"
            label="شكل الدواء"
            value={specs.form}
            mode={mode}
            onChange={noop}
          />
        ) : null}
        {config.concentration ? (
          <ProductField id="pharmacy-profile-catalog.product-pharmacy-specs.product-field.7"
            label="التركيز"
            value={specs.concentration}
            mode={mode}
            onChange={noop}
          />
        ) : null}
        {config.prescriptionRequired ? (
          <ProductField id="pharmacy-profile-catalog.product-pharmacy-specs.product-field.8"
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
    <div {...uiAttributes({ uid: "pharmacy-profile-catalog.product-pharmacy-specs.div.4-xRaAY2", id: "pharmacy-profile-catalog.product-pharmacy-specs.div.4" })} id="pharmacy-profile-catalog.product-pharmacy-specs.div.2" className="grid gap-3 sm:grid-cols-2">
      {config.pharmacyCategory ? (
        <PharmacySelect id="pharmacy-profile-catalog.product-pharmacy-specs.pharmacy-select" ui={{ uid: "pharmacy-catalog.specs.category-K7ccOS", id: "pharmacy-catalog.specs.category", kind: "field", part: "specs" }}
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
        <PharmacySelect id="pharmacy-profile-catalog.product-pharmacy-specs.pharmacy-select.2" ui={{ uid: "pharmacy-catalog.specs.subcategory-bl01Lc", id: "pharmacy-catalog.specs.subcategory", kind: "field", part: "specs" }}
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
        <ProductField id="pharmacy-profile-catalog.product-pharmacy-specs.product-field.9"
          label="الاسم بالعربي"
          value={specs.nameAr}
          mode={mode}
          onChange={(value) => patch({ nameAr: value })}
        />
      ) : null}
      {config.nameEn ? (
        <ProductField id="pharmacy-profile-catalog.product-pharmacy-specs.product-field.10"
          label="الاسم بالإنجليزي"
          value={specs.nameEn}
          mode={mode}
          onChange={(value) => patch({ nameEn: value })}
        />
      ) : null}
      {config.activeIngredient ? (
        <ProductField id="pharmacy-profile-catalog.product-pharmacy-specs.product-field.11"
          label="المادة الفعالة"
          value={specs.activeIngredient}
          mode={mode}
          onChange={(value) =>
            patch({ activeIngredientId: "", activeIngredient: value })
          }
        />
      ) : null}
      {config.form ? (
        <PharmacySelect id="pharmacy-profile-catalog.product-pharmacy-specs.pharmacy-select.3" ui={{ uid: "pharmacy-catalog.specs.form-AbS623", id: "pharmacy-catalog.specs.form", kind: "field", part: "specs" }}
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
        <PharmacySelect id="pharmacy-profile-catalog.product-pharmacy-specs.pharmacy-select.4" ui={{ uid: "pharmacy-catalog.specs.strength-IfRd6w", id: "pharmacy-catalog.specs.strength", kind: "field", part: "specs" }}
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
        <ProductField id="pharmacy-profile-catalog.product-pharmacy-specs.product-field.12"
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

