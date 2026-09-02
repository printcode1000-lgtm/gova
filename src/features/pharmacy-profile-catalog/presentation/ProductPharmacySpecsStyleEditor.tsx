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
    <ProductStyleCard id='features-pharmacy-profile-catalog-presentation-productpharmacyspecsstyleeditor-productstylecard-1-niouxh'
      title="مواصفات الصيدلية"
      visible={value.visible}
      order={value.order}
      disabled={disabled}
      onVisibleChange={(visible) => onChange({ ...value, visible })}
      onOrderChange={(order) => onChange({ ...value, order })}
    >
      <div id='features-pharmacy-profile-catalog-presentation-productpharmacyspecsstyleeditor-div-2-j7fyko' className="grid gap-2 md:grid-cols-2">
        <OptionCheckbox id='features-pharmacy-profile-catalog-presentation-productpharmacyspecsstyleeditor-optioncheckbox-3-kd29jt'
          label="التصنيف الرئيسي"
          checked={value.pharmacyCategory}
          disabled={disabled}
          onChange={(pharmacyCategory) =>
            onChange({ ...value, pharmacyCategory })
          }
        />
        <OptionCheckbox id='features-pharmacy-profile-catalog-presentation-productpharmacyspecsstyleeditor-optioncheckbox-4-fu4bfk'
          label="التصنيف الفرعي"
          checked={value.pharmacySubcategory}
          disabled={disabled}
          onChange={(pharmacySubcategory) =>
            onChange({ ...value, pharmacySubcategory })
          }
        />
        <OptionCheckbox id='features-pharmacy-profile-catalog-presentation-productpharmacyspecsstyleeditor-optioncheckbox-5-mrkevk'
          label="الاسم بالعربي"
          checked={value.nameAr}
          disabled={disabled}
          onChange={(nameAr) => onChange({ ...value, nameAr })}
        />
        <OptionCheckbox id='features-pharmacy-profile-catalog-presentation-productpharmacyspecsstyleeditor-optioncheckbox-6-okh4tv'
          label="الاسم بالإنجليزي"
          checked={value.nameEn}
          disabled={disabled}
          onChange={(nameEn) => onChange({ ...value, nameEn })}
        />
        <OptionCheckbox id='features-pharmacy-profile-catalog-presentation-productpharmacyspecsstyleeditor-optioncheckbox-7-axypga'
          label="المادة الفعالة"
          checked={value.activeIngredient}
          disabled={disabled}
          onChange={(activeIngredient) =>
            onChange({ ...value, activeIngredient })
          }
        />
        <OptionCheckbox id='features-pharmacy-profile-catalog-presentation-productpharmacyspecsstyleeditor-optioncheckbox-8-bxu8pk'
          label="شكل الدواء"
          checked={value.form}
          disabled={disabled}
          onChange={(form) => onChange({ ...value, form })}
        />
        <OptionCheckbox id='features-pharmacy-profile-catalog-presentation-productpharmacyspecsstyleeditor-optioncheckbox-9-lcu9vp'
          label="التركيز"
          checked={value.concentration}
          disabled={disabled}
          onChange={(concentration) => onChange({ ...value, concentration })}
        />
        <OptionCheckbox id='features-pharmacy-profile-catalog-presentation-productpharmacyspecsstyleeditor-optioncheckbox-10-czl6vj'
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
