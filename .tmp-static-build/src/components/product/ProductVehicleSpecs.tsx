"use client";

import * as React from "react";
import { asolApi } from "@/core/api";
import type { ProductVehicleSpecsData } from "@/features/product/entities/product.entity";
import type {
  ProductMode,
  ProductComponentConfig,
} from "./product-component.types";

interface CarOption {
  id: string;
  name: string;
  name_ar: string;
  image?: string;
}

interface CarGroup {
  key: string;
  label: string;
  file: string;
}

const GROUPS: CarGroup[] = [
  { key: "brand", label: "ماركة السيارة", file: "brands.json" },
  { key: "bodyType", label: "نوع الهيكل", file: "body_types.json" },
  { key: "fuel", label: "نوع الوقود", file: "fuel_types.json" },
  {
    key: "transmission",
    label: "ناقل الحركة",
    file: "transmission_types.json",
  },
  { key: "special", label: "تصنيفات خاصة", file: "special_types.json" },
];

const FALLBACK_IMAGE = "/images/subCategories/Cars for Sale.webp";
const IMAGE_GROUPS = new Set(["brand", "bodyType"]);

function optionImage(option: CarOption) {
  return option.image
    ? `/catagory/cars/${option.image.replace(/^\//, "")}`
    : FALLBACK_IMAGE;
}

export function ProductVehicleSpecs({
  mode,
  config,
  specs,
  onChange,
}: {
  mode: ProductMode;
  config: ProductComponentConfig;
  specs: ProductVehicleSpecsData;
  onChange: (specs: ProductVehicleSpecsData) => void;
}) {
  const [options, setOptions] = React.useState<Record<string, CarOption[]>>({});
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    Promise.all(
      GROUPS.map(async (group) => {
        const items = await asolApi.getPublicJson<CarOption[]>(
          `/catagory/cars/data/${group.file}`,
        );
        return [group.key, items] as const;
      }),
    )
      .then((entries) => {
        if (active) setOptions(Object.fromEntries(entries));
      })
      .catch(() => {
        if (active) setOptions({});
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const enabledGroups = GROUPS.filter((group) => config[group.key] !== false);

  if (loading)
    return (
      <p className="text-sm text-muted-foreground">جارٍ تحميل الاختيارات…</p>
    );

  if (mode === "view") {
    const selected = enabledGroups.flatMap((group) => {
      const value = specs[group.key as keyof ProductVehicleSpecsData];
      if (!value) return [];
      const option = options[group.key]?.find((item) => item.id === value);
      return [{ group, value, option }];
    });
    if (selected.length === 0)
      return (
        <p className="text-sm text-muted-foreground">لا توجد مواصفات مختارة.</p>
      );
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {selected.map(({ group, value, option }) => (
          <div
            key={group.key}
            className="flex items-center gap-3 rounded-xl border bg-muted/20 p-3"
          >
            {IMAGE_GROUPS.has(group.key) ? (
              <img
                src={option ? optionImage(option) : FALLBACK_IMAGE}
                alt=""
                loading="lazy"
                className="h-16 w-16 shrink-0 rounded-lg object-contain bg-background"
              />
            ) : null}
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{group.label}</p>
              <p className="mt-1 font-semibold">{option?.name_ar || value}</p>
              {option?.name ? (
                <p className="truncate text-xs text-muted-foreground" dir="ltr">
                  {option.name}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {enabledGroups.map((group) => {
        const selectedId =
          specs[group.key as keyof ProductVehicleSpecsData] ?? "";
        return (
          <details
            key={group.key}
            className="rounded-xl border bg-card"
            open={false}
          >
            <summary className="cursor-pointer px-4 py-3 font-semibold">
              {group.label}
              {selectedId ? (
                <span className="mr-2 text-sm font-normal text-primary">
                  (
                  {options[group.key]?.find((item) => item.id === selectedId)
                    ?.name_ar || selectedId}
                  )
                </span>
              ) : null}
            </summary>
            <div className="grid grid-cols-2 gap-2 border-t p-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {(options[group.key] ?? []).map((option) => {
                const selected = selectedId === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() =>
                      onChange({
                        ...specs,
                        [group.key]: selected ? "" : option.id,
                      })
                    }
                    className={`rounded-xl border p-2 text-center transition-colors ${
                      selected
                        ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                        : "border-border bg-background"
                    }`}
                  >
                    {IMAGE_GROUPS.has(group.key) ? (
                      <img
                        src={optionImage(option)}
                        alt=""
                        loading="lazy"
                        className="mx-auto h-16 w-full rounded-lg object-contain"
                      />
                    ) : null}
                    <span className="mt-2 block text-sm font-medium">
                      {option.name_ar}
                    </span>
                  </button>
                );
              })}
            </div>
          </details>
        );
      })}
    </div>
  );
}
