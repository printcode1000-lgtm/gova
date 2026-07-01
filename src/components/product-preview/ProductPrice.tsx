"use client";

import * as React from "react";
import {
  FieldsGrid,
  initialValue,
  ProductComponentFrame,
  ProductField,
} from "./shared";
import type { ProductPreviewComponentProps } from "./types";

export function ProductPrice({
  mode,
  current,
  beforeDiscount,
  needsCar,
}: ProductPreviewComponentProps & {
  current: boolean;
  beforeDiscount: boolean;
  needsCar: boolean;
}) {
  const [currentValue, setCurrentValue] = React.useState(
    initialValue(mode, "1250"),
  );
  const [oldValue, setOldValue] = React.useState(initialValue(mode, "1500"));
  const [delivery, setDelivery] = React.useState(initialValue(mode, "لا"));
  return (
    <ProductComponentFrame title="السعر">
      <FieldsGrid>
        {current ? (
          <ProductField
            label="السعر الحالي"
            value={currentValue}
            mode={mode}
            onChange={setCurrentValue}
            type="number"
          />
        ) : null}
        {beforeDiscount ? (
          <ProductField
            label="السعر قبل الخصم"
            value={oldValue}
            mode={mode}
            onChange={setOldValue}
            type="number"
          />
        ) : null}
        {needsCar ? (
          <ProductField
            label="يحتاج سيارة"
            value={delivery}
            mode={mode}
            onChange={setDelivery}
          />
        ) : null}
      </FieldsGrid>
    </ProductComponentFrame>
  );
}
