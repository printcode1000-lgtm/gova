"use client";

import * as React from "react";
import {
  FieldsGrid,
  initialValue,
  ProductComponentFrame,
  ProductField,
} from "./shared";
import type { ProductPreviewComponentProps } from "./types";

export function ProductMainData({
  mode,
  fields,
}: ProductPreviewComponentProps & {
  fields: Record<
    "name" | "brand" | "manufacturer" | "available" | "description",
    boolean
  >;
}) {
  const [values, setValues] = React.useState({
    name: initialValue(mode, "منتج تجريبي"),
    brand: initialValue(mode, "جوفا"),
    manufacturer: initialValue(mode, "الشركة المصنعة"),
    available: initialValue(mode, "متوفر"),
    description: initialValue(mode, "وصف تجريبي للمنتج أو الخدمة المعروضة."),
  });
  const field = (key: keyof typeof values, label: string, multiline = false) =>
    fields[key] ? (
      <ProductField
        label={label}
        value={values[key]}
        mode={mode}
        multiline={multiline}
        onChange={(value) =>
          setValues((current) => ({ ...current, [key]: value }))
        }
      />
    ) : null;
  return (
    <ProductComponentFrame title="البيانات الأساسية">
      <FieldsGrid>
        {field("name", "الاسم")}
        {field("brand", "العلامة التجارية")}
        {field("manufacturer", "الشركة المصنعة")}
        {field("available", "التوفر")}
        {field("description", "الوصف", true)}
      </FieldsGrid>
    </ProductComponentFrame>
  );
}
