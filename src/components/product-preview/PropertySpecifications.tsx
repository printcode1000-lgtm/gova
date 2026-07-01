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
  area: "180 م²",
  rooms: "3",
  bathrooms: "2",
  type: "شقة",
  address: "القاهرة الجديدة",
  location: "التجمع الخامس",
  finishing: "سوبر لوكس",
};
const labels = {
  area: "المساحة",
  rooms: "عدد الغرف",
  bathrooms: "عدد الحمامات",
  type: "نوع العقار",
  address: "العنوان",
  location: "الموقع",
  finishing: "التشطيب",
};
export function PropertySpecifications({
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
    <ProductComponentFrame title="مواصفات العقار">
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
