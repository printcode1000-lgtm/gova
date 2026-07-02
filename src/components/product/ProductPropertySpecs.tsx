"use client";

import * as React from "react";
import {
  GovaMap,
  createOpenStreetMapProvider,
  markerAt,
} from "@/components/ui/GovaMap";
import type { ProductFieldValues } from "@/features/product/entities/product.entity";
import { ProductField } from "./ProductComponentPrimitives";
import type {
  ProductComponentConfig,
  ProductMode,
} from "./product-component.types";

const LATITUDE_KEY = "propertySpecs.locationLatitude";
const LONGITUDE_KEY = "propertySpecs.locationLongitude";
const tileProvider = createOpenStreetMapProvider();

const PROPERTY_FIELDS: Array<[string, string, React.HTMLInputTypeAttribute]> = [
  ["area", "المساحة", "number"],
  ["rooms", "عدد الغرف", "number"],
  ["bathrooms", "عدد الحمامات", "number"],
  ["type", "نوع العقار", "text"],
  ["address", "العنوان", "text"],
  ["finishing", "التشطيب", "text"],
];

function readCoordinate(value: string | undefined) {
  if (!value?.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function openDeviceMaps(latitude: number, longitude: number) {
  const encoded = encodeURIComponent(`${latitude},${longitude}`);
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
    window.location.href = `maps://maps.apple.com/?q=${encoded}&ll=${encoded}`;
    return;
  }
  if (/Android/i.test(navigator.userAgent)) {
    window.location.href = `geo:${latitude},${longitude}?q=${encoded}`;
    return;
  }
  window.open(
    `https://www.google.com/maps/search/?api=1&query=${encoded}`,
    "_blank",
    "noopener,noreferrer",
  );
}

export function ProductPropertySpecs({
  mode,
  config,
  fields,
  onChange,
}: {
  mode: ProductMode;
  config: ProductComponentConfig;
  fields: ProductFieldValues;
  onChange: (fields: ProductFieldValues) => void;
}) {
  const latitude = readCoordinate(fields[LATITUDE_KEY]);
  const longitude = readCoordinate(fields[LONGITUDE_KEY]);
  const hasLocation = latitude !== null && longitude !== null;

  const updateLocation = React.useCallback(
    (nextLatitude: number, nextLongitude: number) => {
      onChange({
        ...fields,
        [LATITUDE_KEY]: String(nextLatitude),
        [LONGITUDE_KEY]: String(nextLongitude),
      });
    },
    [fields, onChange],
  );

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {PROPERTY_FIELDS.map(([fieldKey, label, type]) => {
        if (config[fieldKey] === false) return null;
        const storageKey = `propertySpecs.${fieldKey}`;
        return (
          <ProductField
            key={storageKey}
            label={label}
            value={fields[storageKey] ?? ""}
            mode={mode}
            type={type}
            onChange={(value) => onChange({ ...fields, [storageKey]: value })}
          />
        );
      })}

      {config.location !== false ? (
        <div className="sm:col-span-2">
          <p className="mb-2 text-sm font-medium">الموقع</p>
          {mode === "view" ? (
            hasLocation ? (
              <button
                type="button"
                onClick={() => openDeviceMaps(latitude, longitude)}
                className="gova-control inline-flex items-center justify-center bg-primary px-5 font-semibold text-on-primary"
              >
                فتح الموقع في الخرائط
              </button>
            ) : (
              <div className="rounded-xl bg-muted/40 px-3 py-2.5 text-muted-foreground">
                لم يتم تحديد الموقع.
              </div>
            )
          ) : (
            <div className="space-y-2">
              <GovaMap
                modes={["picker"]}
                providers={{ tile: tileProvider }}
                initialViewport={
                  hasLocation
                    ? { latitude, longitude, zoom: 15 }
                    : undefined
                }
                markers={
                  hasLocation
                    ? [markerAt(longitude, latitude, "property-location")]
                    : []
                }
                layers={{ baseMap: true, markers: true }}
                ariaLabel="اختيار موقع العقار"
                loadingLabel="جارٍ تحميل الخريطة…"
                retryLabel="إعادة المحاولة"
                onTap={({ latitude: nextLatitude, longitude: nextLongitude }) =>
                  updateLocation(nextLatitude, nextLongitude)
                }
              />
              <p className="text-xs text-muted-foreground">
                اضغط على الخريطة لتحديد موقع العقار.
              </p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
