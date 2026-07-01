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
  brand: "تويوتا",
  bodyType: "سيدان",
  fuel: "بنزين",
  transmission: "أوتوماتيك",
};
const labels = {
  brand: "الماركة",
  bodyType: "نوع الهيكل",
  fuel: "نوع الوقود",
  transmission: "ناقل الحركة",
};
export function VehicleSpecifications({
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
    <ProductComponentFrame title="مواصفات المركبة">
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
