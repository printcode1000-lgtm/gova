"use client";

import { useMemo } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProductFieldValues } from "@/features/product/entities/product.entity";
import { categoryService } from "@/features/categories";
import { ProductField } from "./ProductComponentPrimitives";
import type {
  ProductComponentConfig,
  ProductMode,
} from "./product-component.types";

interface ProductPharmacySpecsProps {
  mode: ProductMode;
  config: ProductComponentConfig;
  fields: ProductFieldValues;
  onChange: (fields: ProductFieldValues) => void;
}

const FIELD_PREFIX = "pharmacySpecs.";

function fieldKey(key: string) {
  return `${FIELD_PREFIX}${key}`;
}

function getField(fields: ProductFieldValues, key: string) {
  return fields[fieldKey(key)] ?? "";
}

export function ProductPharmacySpecs({
  mode,
  config,
  fields,
  onChange,
}: ProductPharmacySpecsProps) {
  const categories = useMemo(() => categoryService.getPharmacyCategories(), []);
  const selectedCategory =
    categories.find(
      (category) =>
        String(category.id) === getField(fields, "pharmacyCategoryId") ||
        category.nameAr === getField(fields, "pharmacyCategory"),
    ) ?? categories[0];

  const subcategories = useMemo(
    () =>
      selectedCategory
        ? categoryService.getPharmacySubcategories(selectedCategory.id)
        : [],
    [selectedCategory],
  );
  const selectedSubcategory =
    subcategories.find(
      (subcategory) =>
        String(subcategory.id) === getField(fields, "pharmacySubcategoryId") ||
        subcategory.nameAr === getField(fields, "pharmacySubcategory"),
    ) ?? subcategories[0];

  const activeIngredients = useMemo(
    () =>
      selectedSubcategory
        ? categoryService.getPharmacyActiveIngredients(selectedSubcategory.id)
        : [],
    [selectedSubcategory],
  );
  const selectedActiveIngredient =
    activeIngredients.find(
      (activeIngredient) =>
        String(activeIngredient.id) === getField(fields, "activeIngredientId") ||
        activeIngredient.nameAr === getField(fields, "activeIngredient"),
    ) ?? activeIngredients[0];

  const forms = useMemo(
    () =>
      selectedActiveIngredient
        ? categoryService.getPharmacyFormsForActiveIngredient(
            selectedActiveIngredient.id,
          )
        : [],
    [selectedActiveIngredient],
  );
  const selectedForm =
    forms.find(
      (form) =>
        form.id === getField(fields, "formId") ||
        form.nameAr === getField(fields, "form"),
    ) ?? forms[0];

  const strengths = useMemo(
    () =>
      selectedActiveIngredient
        ? categoryService.getPharmacyStrengthsForActiveIngredient(
            selectedActiveIngredient.id,
          )
        : [],
    [selectedActiveIngredient],
  );
  const selectedStrength =
    strengths.find(
      (strength) =>
        strength.id === getField(fields, "concentrationId") ||
        strength.value === getField(fields, "concentration"),
    ) ?? strengths[0];

  function patch(next: ProductFieldValues) {
    onChange({ ...fields, ...next });
  }

  function selectCategory(categoryId: string) {
    const category = categories.find((item) => String(item.id) === categoryId);
    const firstSubcategory = category
      ? categoryService.getPharmacySubcategories(category.id)[0]
      : undefined;
    const firstActiveIngredient = firstSubcategory
      ? categoryService.getPharmacyActiveIngredients(firstSubcategory.id)[0]
      : undefined;
    const firstForm = firstActiveIngredient
      ? categoryService.getPharmacyFormsForActiveIngredient(
          firstActiveIngredient.id,
        )[0]
      : undefined;
    const firstStrength = firstActiveIngredient
      ? categoryService.getPharmacyStrengthsForActiveIngredient(
          firstActiveIngredient.id,
        )[0]
      : undefined;

    patch({
      [fieldKey("pharmacyCategoryId")]: category ? String(category.id) : "",
      [fieldKey("pharmacyCategory")]: category?.nameAr ?? "",
      [fieldKey("pharmacySubcategoryId")]: firstSubcategory
        ? String(firstSubcategory.id)
        : "",
      [fieldKey("pharmacySubcategory")]: firstSubcategory?.nameAr ?? "",
      [fieldKey("activeIngredientId")]: firstActiveIngredient
        ? String(firstActiveIngredient.id)
        : "",
      [fieldKey("activeIngredient")]: firstActiveIngredient?.nameAr ?? "",
      [fieldKey("formId")]: firstForm?.id ?? "",
      [fieldKey("form")]: firstForm?.nameAr ?? "",
      [fieldKey("concentrationId")]: firstStrength?.id ?? "",
      [fieldKey("concentration")]: firstStrength?.value ?? "",
      [fieldKey("prescriptionRequired")]: firstActiveIngredient
        ? String(firstActiveIngredient.prescriptionRequired)
        : "false",
    });
  }

  function selectSubcategory(subcategoryId: string) {
    const subcategory = subcategories.find(
      (item) => String(item.id) === subcategoryId,
    );
    const firstActiveIngredient = subcategory
      ? categoryService.getPharmacyActiveIngredients(subcategory.id)[0]
      : undefined;
    const firstForm = firstActiveIngredient
      ? categoryService.getPharmacyFormsForActiveIngredient(
          firstActiveIngredient.id,
        )[0]
      : undefined;
    const firstStrength = firstActiveIngredient
      ? categoryService.getPharmacyStrengthsForActiveIngredient(
          firstActiveIngredient.id,
        )[0]
      : undefined;

    patch({
      [fieldKey("pharmacySubcategoryId")]: subcategory
        ? String(subcategory.id)
        : "",
      [fieldKey("pharmacySubcategory")]: subcategory?.nameAr ?? "",
      [fieldKey("activeIngredientId")]: firstActiveIngredient
        ? String(firstActiveIngredient.id)
        : "",
      [fieldKey("activeIngredient")]: firstActiveIngredient?.nameAr ?? "",
      [fieldKey("formId")]: firstForm?.id ?? "",
      [fieldKey("form")]: firstForm?.nameAr ?? "",
      [fieldKey("concentrationId")]: firstStrength?.id ?? "",
      [fieldKey("concentration")]: firstStrength?.value ?? "",
      [fieldKey("prescriptionRequired")]: firstActiveIngredient
        ? String(firstActiveIngredient.prescriptionRequired)
        : "false",
    });
  }

  function selectActiveIngredient(activeIngredientId: string) {
    const activeIngredient = activeIngredients.find(
      (item) => String(item.id) === activeIngredientId,
    );
    const firstForm = activeIngredient
      ? categoryService.getPharmacyFormsForActiveIngredient(
          activeIngredient.id,
        )[0]
      : undefined;
    const firstStrength = activeIngredient
      ? categoryService.getPharmacyStrengthsForActiveIngredient(
          activeIngredient.id,
        )[0]
      : undefined;

    patch({
      [fieldKey("activeIngredientId")]: activeIngredient
        ? String(activeIngredient.id)
        : "",
      [fieldKey("activeIngredient")]: activeIngredient?.nameAr ?? "",
      [fieldKey("formId")]: firstForm?.id ?? "",
      [fieldKey("form")]: firstForm?.nameAr ?? "",
      [fieldKey("concentrationId")]: firstStrength?.id ?? "",
      [fieldKey("concentration")]: firstStrength?.value ?? "",
      [fieldKey("prescriptionRequired")]: activeIngredient
        ? String(activeIngredient.prescriptionRequired)
        : "false",
    });
  }

  function selectForm(formId: string) {
    const form = forms.find((item) => item.id === formId);
    patch({
      [fieldKey("formId")]: form?.id ?? "",
      [fieldKey("form")]: form?.nameAr ?? "",
    });
  }

  function selectStrength(strengthId: string) {
    const strength = strengths.find((item) => item.id === strengthId);
    patch({
      [fieldKey("concentrationId")]: strength?.id ?? "",
      [fieldKey("concentration")]: strength?.value ?? "",
    });
  }

  const noop = () => {};

  if (mode === "view") {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {config.pharmacyCategory ? (
          <ProductField
            label="التصنيف الرئيسي"
            value={getField(fields, "pharmacyCategory")}
            mode={mode}
            onChange={noop}
          />
        ) : null}
        {config.pharmacySubcategory ? (
          <ProductField
            label="التصنيف الفرعي"
            value={getField(fields, "pharmacySubcategory")}
            mode={mode}
            onChange={noop}
          />
        ) : null}
        {config.nameAr ? (
          <ProductField
            label="الاسم بالعربي"
            value={getField(fields, "nameAr")}
            mode={mode}
            onChange={noop}
          />
        ) : null}
        {config.nameEn ? (
          <ProductField
            label="الاسم بالإنجليزي"
            value={getField(fields, "nameEn")}
            mode={mode}
            onChange={noop}
          />
        ) : null}
        {config.activeIngredient ? (
          <ProductField
            label="المادة الفعالة"
            value={getField(fields, "activeIngredient")}
            mode={mode}
            onChange={noop}
          />
        ) : null}
        {config.form ? (
          <ProductField
            label="شكل الدواء"
            value={getField(fields, "form")}
            mode={mode}
            onChange={noop}
          />
        ) : null}
        {config.concentration ? (
          <ProductField
            label="التركيز"
            value={getField(fields, "concentration")}
            mode={mode}
            onChange={noop}
          />
        ) : null}
        {config.prescriptionRequired ? (
          <ProductField
            label="يتطلب روشتة"
            value={getField(fields, "prescriptionRequired")}
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
          value={getField(fields, "nameAr")}
          mode={mode}
          onChange={(value) => patch({ [fieldKey("nameAr")]: value })}
        />
      ) : null}
      {config.nameEn ? (
        <ProductField
          label="الاسم بالإنجليزي"
          value={getField(fields, "nameEn")}
          mode={mode}
          onChange={(value) => patch({ [fieldKey("nameEn")]: value })}
        />
      ) : null}
      {config.activeIngredient ? (
        <PharmacySelect
          label="المادة الفعالة"
          value={
            selectedActiveIngredient ? String(selectedActiveIngredient.id) : ""
          }
          disabled={activeIngredients.length === 0}
          placeholder="اختر المادة الفعالة"
          options={activeIngredients.map((activeIngredient) => ({
            value: String(activeIngredient.id),
            label: activeIngredient.nameAr,
          }))}
          onChange={selectActiveIngredient}
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
          value={getField(fields, "prescriptionRequired")}
          mode={mode}
          type="boolean"
          onChange={(value) =>
            patch({ [fieldKey("prescriptionRequired")]: value })
          }
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
