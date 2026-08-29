"use client";

import Image from "next/image";
import * as React from "react";
import {
  vehicleCatalogService,
  type VehicleCatalog,
  type VehicleCatalogOption,
} from "@/features/vehicle-catalog";
import type { ProductVehicleSpecsData } from "@/features/product";
import type {
  ProductMode,
  ProductComponentConfig,
} from "./product-component.types";
import { uiAttributes } from "@asol/ui-registry-core";

const FALLBACK_IMAGE = "/images/subCategories/Cars for Sale.webp";

function optionImage(option: VehicleCatalogOption, imageRoot: string) {
  return option.image
    ? `${imageRoot}/${option.image.replace(/^\//, "")}`
    : FALLBACK_IMAGE;
}

export function ProductVehicleSpecs({ id,
  mode,
  config,
  specs,
  onChange,
}: {
  mode: ProductMode;
  config: ProductComponentConfig;
  specs: ProductVehicleSpecsData;
  onChange: (specs: ProductVehicleSpecsData) => void;
} & { id?: string }) {
  const [catalog, setCatalog] = React.useState<VehicleCatalog | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    vehicleCatalogService
      .load()
      .then((loadedCatalog) => {
        if (active) setCatalog(loadedCatalog);
      })
      .catch(() => {
        if (active) setCatalog(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const enabledGroups = (catalog?.groups ?? []).filter((group) => config[group.key] !== false);
  const options = catalog?.optionsByGroup ?? {};

  if (loading)
    return (
      <p {...uiAttributes({ uid: "product.product-vehicle-specs.p-0IIxLM", id: "product.product-vehicle-specs.p" })} id={id} className="text-sm text-muted-foreground">جارٍ تحميل الاختيارات…</p>
    );

  if (mode === "view") {
    const selected = enabledGroups.flatMap((group) => {
      const value = specs[group.key as keyof ProductVehicleSpecsData];
      if (!value) return [];
      const option = options[group.key]?.find((item) => item.id === value);
      if (!option) return [];
      return [{ group, value, option }];
    });
    if (selected.length === 0)
      return (
        <p {...uiAttributes({ uid: "product.product-vehicle-specs.p.2-q4PJVn", id: "product.product-vehicle-specs.p.2" })} id={id} className="text-sm text-muted-foreground">لا توجد مواصفات مختارة.</p>
      );
    return (
      <div {...uiAttributes({ uid: "product.product-vehicle-specs.div-FJ6CHB", id: "product.product-vehicle-specs.div" })} id={id} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {selected.map(({ group, value, option }) => (
          <div
            key={group.key} {...uiAttributes({ uid: "product.product-vehicle-specs.div.2-T0vZaC", id: "product.product-vehicle-specs.div.2" })}
            className="flex items-center gap-3 rounded-xl border bg-muted/20 p-3"
          >
            {group.supportsImage ? (
              <Image
                src={option && catalog ? optionImage(option, catalog.imageRoot) : FALLBACK_IMAGE}
                alt=""
                width={64}
                height={64}
                unoptimized
                className="h-16 w-16 shrink-0 rounded-lg object-contain bg-background"
              />
            ) : null}
            <div {...uiAttributes({ uid: "product.product-vehicle-specs.div.3-3W1Ozx", id: "product.product-vehicle-specs.div.3" })} className="min-w-0">
              <p {...uiAttributes({ uid: "product.product-vehicle-specs.p.3-a4n0nQ", id: "product.product-vehicle-specs.p.3" })} className="text-xs text-muted-foreground">{group.name.ar}</p>
              <p {...uiAttributes({ uid: "product.product-vehicle-specs.p.4-IVp3N3", id: "product.product-vehicle-specs.p.4" })} className="mt-1 font-semibold">{option?.name.ar || value}</p>
              {option?.name.en ? (
                <p {...uiAttributes({ uid: "product.product-vehicle-specs.p.5-g2gJb8", id: "product.product-vehicle-specs.p.5" })} className="truncate text-xs text-muted-foreground" dir="ltr">
                  {option.name.en}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div {...uiAttributes({ uid: "product.product-vehicle-specs.div.4-IyT8Db", id: "product.product-vehicle-specs.div.4" })} id={id} className="space-y-3">
      {enabledGroups.map((group) => {
        const selectedId =
          specs[group.key as keyof ProductVehicleSpecsData] ?? "";
        const selectedOption = options[group.key]?.find((item) => item.id === selectedId);
        return (
          <details id={id}
            key={group.key}
            className="rounded-xl border bg-card"
            open={false}
          >
            <summary {...uiAttributes({ uid: "product.product-vehicle-specs.summary-D9xbUC", id: "product.product-vehicle-specs.summary" })} className="px-4 py-3 font-semibold">
              {group.name.ar}
              {selectedOption ? (
                <span {...uiAttributes({ uid: "product.product-vehicle-specs.span-NZTy95", id: "product.product-vehicle-specs.span" })} className="mr-2 text-sm font-normal text-primary">
                  (
                  {selectedOption.name.ar}
                  )
                </span>
              ) : null}
            </summary>
            <div {...uiAttributes({ uid: "product.product-vehicle-specs.div.5-v3yNkZ", id: "product.product-vehicle-specs.div.5" })} className="grid grid-cols-2 gap-2 border-t p-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {(options[group.key] ?? []).map((option) => {
                const selected = selectedId === option.id;
                return (
                  <button id={id}
                    key={option.id} {...uiAttributes({ uid: "product.product-vehicle-specs.button-KB2KXM", id: "product.product-vehicle-specs.button" })}
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
                    {group.supportsImage ? (
                      <Image
                        src={catalog ? optionImage(option, catalog.imageRoot) : FALLBACK_IMAGE}
                        alt=""
                        width={160}
                        height={64}
                        unoptimized
                        className="mx-auto h-16 w-full rounded-lg object-contain"
                      />
                    ) : null}
                    <span {...uiAttributes({ uid: "product.product-vehicle-specs.span.2-851IGF", id: "product.product-vehicle-specs.span.2" })} className="mt-2 block text-sm font-medium">
                      {option.name.ar}
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
