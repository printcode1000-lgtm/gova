"use client";

import * as React from "react";
import { OptionCheckbox } from "@/shared/ui/product-style-card";
import type { ProductSearchColumnSettings } from "@/shared/ui/product-style-settings";

interface ProductSearchColumnsStyleEditorProps {
  value: ProductSearchColumnSettings;
  disabled?: boolean;
  onChange: (value: ProductSearchColumnSettings) => void;
}

const GROUPS = [
  {
    key: "mainData",
    title: "البيانات الرئيسية",
    options: [
      ["name", "اسم المنتج"],
      ["brand", "العلامة التجارية"],
      ["manufacturer", "الشركة المصنعة"],
      ["available", "متوفر"],
      ["description", "الوصف"],
    ],
  },
  {
    key: "price",
    title: "السعر",
    options: [
      ["current", "السعر الحالي"],
      ["beforeDiscount", "قبل الخصم"],
      ["label", "نص السعر"],
      ["needsCar", "يحتاج سيارة"],
    ],
  },
  {
    key: "rating",
    title: "التقييم",
    options: [["value", "قيمة التقييم"]],
  },
  {
    key: "specifications",
    title: "المواصفات العامة",
    options: [
      ["color", "اللون"],
      ["dimensions", "الأبعاد"],
      ["condition", "الحالة"],
      ["size", "المقاس"],
      ["weight", "الوزن"],
      ["year", "سنة الصنع"],
    ],
  },
  {
    key: "vehicleSpecs",
    title: "مواصفات المركبة",
    options: [
      ["brand", "ماركة المركبة"],
      ["bodyType", "نوع الهيكل"],
      ["fuel", "الوقود"],
      ["transmission", "ناقل الحركة"],
      ["special", "خاص"],
    ],
  },
  {
    key: "propertySpecs",
    title: "مواصفات العقار",
    options: [
      ["area", "المساحة"],
      ["rooms", "عدد الغرف"],
      ["bathrooms", "عدد الحمامات"],
      ["type", "نوع العقار"],
      ["address", "العنوان"],
      ["location", "الموقع"],
      ["finishing", "التشطيب"],
    ],
  },
  {
    key: "pharmacySpecs",
    title: "مواصفات الصيدلية",
    options: [
      ["pharmacyCategory", "التصنيف الرئيسي"],
      ["pharmacySubcategory", "التصنيف الفرعي"],
      ["nameAr", "الاسم بالعربي"],
      ["nameEn", "الاسم بالإنجليزي"],
      ["activeIngredient", "المادة الفعالة"],
      ["form", "شكل الدواء"],
      ["concentration", "التركيز"],
      ["prescriptionRequired", "يتطلب روشتة"],
    ],
  },
] as const;

export function ProductSearchColumnsStyleEditor({
  value,
  disabled = false,
  onChange,
}: ProductSearchColumnsStyleEditorProps) {
  const update = (
    groupKey: keyof ProductSearchColumnSettings,
    optionKey: string,
    checked: boolean,
  ) => {
    onChange({
      ...value,
      [groupKey]: {
        ...value[groupKey],
        [optionKey]: checked,
      },
    });
  };

  return (
    <section id="product.style-editors.search-columns.product-search-columns-style-editor.section" className="rounded-xl border border-outline-variant bg-background p-4 shadow-sm">
      <div id="product.style-editors.search-columns.product-search-columns-style-editor.div" className="border-b border-outline-variant pb-3">
        <h3 id="product.style-editors.search-columns.product-search-columns-style-editor.h3" className="text-sm font-bold">أعمدة البحث</h3>
        <p id="product.style-editors.search-columns.product-search-columns-style-editor.p" className="mt-1 text-xs text-muted-foreground">
          هذه الحاوية لا تملك ترتيبًا. ترتيب المكونات يتحكم فقط في ظهور المكونات داخل صفحة المنتج.
        </p>
      </div>
      <div id="product.style-editors.search-columns.product-search-columns-style-editor.div.2" className="mt-4 space-y-4">
        {GROUPS.map((group) => (
          <div key={group.key} className="rounded-lg border border-outline-variant p-3">
            <h4 className="mb-2 text-xs font-bold text-primary">{group.title}</h4>
            <div className="grid gap-2">
              {group.options.map(([optionKey, label]) => (
                <OptionCheckbox
                  key={optionKey}
                  label={label}
                  checked={Boolean(value[group.key][optionKey as keyof typeof value[typeof group.key]])}
                  disabled={disabled}
                  onChange={(checked) =>
                    update(group.key as keyof ProductSearchColumnSettings, optionKey, checked)
                  }
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
