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
  nameAr: "دواء تجريبي",
  nameEn: "Demo Medicine",
  form: "أقراص",
  concentration: "500 مجم",
  activeIngredient: "مادة فعالة تجريبية",
};
const labels = {
  nameAr: "الاسم بالعربي",
  nameEn: "الاسم بالإنجليزي",
  form: "شكل الدواء",
  concentration: "التركيز",
  activeIngredient: "المادة الفعالة",
};
export function PharmacySpecifications({
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
    <ProductComponentFrame title="مواصفات الصيدلية">
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
