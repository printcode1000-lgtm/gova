"use client";

import * as React from "react";
import {
  FieldsGrid,
  initialValue,
  ProductComponentFrame,
  ProductField,
} from "./shared";
import type { ProductPreviewComponentProps } from "./types";

const samples = {
  color: "أسود",
  dimensions: "40 × 30 × 15 سم",
  condition: "جديد",
  size: "متوسط",
  weight: "2 كجم",
  year: "2026",
};
const labels = {
  color: "اللون",
  dimensions: "الأبعاد",
  condition: "الحالة",
  size: "المقاس",
  weight: "الوزن",
  year: "السنة",
};
export function ProductSpecifications({
  mode,
  fields,
}: ProductPreviewComponentProps & {
  fields: Record<keyof typeof samples, boolean>;
}) {
  const [values, setValues] = React.useState(
    () =>
      Object.fromEntries(
        Object.entries(samples).map(([key, value]) => [
          key,
          initialValue(mode, value),
        ]),
      ) as typeof samples,
  );
  return (
    <ProductComponentFrame title="المواصفات">
      <FieldsGrid>
        {(Object.keys(samples) as Array<keyof typeof samples>).map((key) =>
          fields[key] ? (
            <ProductField
              key={key}
              label={labels[key]}
              value={values[key]}
              mode={mode}
              onChange={(value) =>
                setValues((current) => ({ ...current, [key]: value }))
              }
            />
          ) : null,
        )}
      </FieldsGrid>
    </ProductComponentFrame>
  );
}
