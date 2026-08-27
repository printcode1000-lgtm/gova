"use client";

import {
  OptionCheckbox,
  ProductStyleCard,
} from "@/shared/ui/product-style-card";
import type { ProductPharmacySpecsStyleSettings } from "@/shared/ui/product-style-settings";

interface ProductPharmacySpecsStyleEditorProps {
  value: ProductPharmacySpecsStyleSettings;
  disabled?: boolean;
  onChange: (value: ProductPharmacySpecsStyleSettings) => void;
}

export function ProductPharmacySpecsStyleEditor({
  value,
  disabled = false,
  onChange,
}: ProductPharmacySpecsStyleEditorProps) {
  return (
    <ProductStyleCard id="pharmacy-profile-catalog.product-pharmacy-specs-style-editor.product-style-card"
      title="مواصفات الصيدلية"
      visible={value.visible}
      order={value.order}
      disabled={disabled}
      onVisibleChange={(visible) => onChange({ ...value, visible })}
      onOrderChange={(order) => onChange({ ...value, order })}
    >
      <div id="pharmacy-profile-catalog.product-pharmacy-specs-style-editor.div" className="grid gap-2 md:grid-cols-2">
        <OptionCheckbox id="pharmacy-profile-catalog.product-pharmacy-specs-style-editor.option-checkbox"
          label="التصنيف الرئيسي"
          checked={value.pharmacyCategory}
          disabled={disabled}
          onChange={(pharmacyCategory) =>
            onChange({ ...value, pharmacyCategory })
          }
        />
        <OptionCheckbox id="pharmacy-profile-catalog.product-pharmacy-specs-style-editor.option-checkbox.2"
          label="التصنيف الفرعي"
          checked={value.pharmacySubcategory}
          disabled={disabled}
          onChange={(pharmacySubcategory) =>
            onChange({ ...value, pharmacySubcategory })
          }
        />
        <OptionCheckbox id="pharmacy-profile-catalog.product-pharmacy-specs-style-editor.option-checkbox.3"
          label="الاسم بالعربي"
          checked={value.nameAr}
          disabled={disabled}
          onChange={(nameAr) => onChange({ ...value, nameAr })}
        />
        <OptionCheckbox id="pharmacy-profile-catalog.product-pharmacy-specs-style-editor.option-checkbox.4"
          label="الاسم بالإنجليزي"
          checked={value.nameEn}
          disabled={disabled}
          onChange={(nameEn) => onChange({ ...value, nameEn })}
        />
        <OptionCheckbox id="pharmacy-profile-catalog.product-pharmacy-specs-style-editor.option-checkbox.5"
          label="المادة الفعالة"
          checked={value.activeIngredient}
          disabled={disabled}
          onChange={(activeIngredient) =>
            onChange({ ...value, activeIngredient })
          }
        />
        <OptionCheckbox id="pharmacy-profile-catalog.product-pharmacy-specs-style-editor.option-checkbox.6"
          label="شكل الدواء"
          checked={value.form}
          disabled={disabled}
          onChange={(form) => onChange({ ...value, form })}
        />
        <OptionCheckbox id="pharmacy-profile-catalog.product-pharmacy-specs-style-editor.option-checkbox.7"
          label="التركيز"
          checked={value.concentration}
          disabled={disabled}
          onChange={(concentration) => onChange({ ...value, concentration })}
        />
        <OptionCheckbox id="pharmacy-profile-catalog.product-pharmacy-specs-style-editor.option-checkbox.8"
          label="يتطلب روشتة"
          checked={value.prescriptionRequired}
          disabled={disabled}
          onChange={(prescriptionRequired) =>
            onChange({ ...value, prescriptionRequired })
          }
        />
      </div>
    </ProductStyleCard>
  );
}
