"use client";

import * as React from "react";
import {
  AsolMap,
  createOpenStreetMapProvider,
  markerAt,
} from "@/components/ui/AsolMap";
import type { ProductPropertySpecsData } from "@/features/product/entities/product.entity";
import { ProductField } from "./ProductComponentPrimitives";
import type {
  ProductComponentConfig,
  ProductMode,
} from "./product-component.types";

const DEFAULT_LOCATION = {
  latitude: 29.9668,
  longitude: 32.5498,
  zoom: 11,
  bearing: 0,
  pitch: 0,
};
const tileProvider = createOpenStreetMapProvider();

const PROPERTY_FIELDS: Array<[string, string, React.HTMLInputTypeAttribute]> = [
  ["area", "المساحة", "number"],
  ["rooms", "عدد الغرف", "number"],
  ["bathrooms", "عدد الحمامات", "number"],
  ["type", "نوع العقار", "text"],
  ["address", "العنوان", "text"],
  ["finishing", "التشطيب", "text"],
];

function readCoordinate(value: string | undefined, min: number, max: number) {
  if (!value?.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max
    ? number
    : null;
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
  specs,
  onChange,
}: {
  mode: ProductMode;
  config: ProductComponentConfig;
  specs: ProductPropertySpecsData;
  onChange: (specs: ProductPropertySpecsData) => void;
}) {
  const [mapOpen, setMapOpen] = React.useState(true);
  const [mapMessage, setMapMessage] = React.useState("");
  const latitude = readCoordinate(specs.locationLatitude, -90, 90);
  const longitude = readCoordinate(specs.locationLongitude, -180, 180);
  const hasLocation = latitude !== null && longitude !== null;

  const updateLocation = React.useCallback(
    (nextLatitude: number, nextLongitude: number) => {
      onChange({
        ...specs,
        locationLatitude: String(nextLatitude),
        locationLongitude: String(nextLongitude),
      });
      setMapMessage("تم اختيار الموقع. احفظ المنتج لتثبيت التغيير.");
    },
    [onChange, specs],
  );

  const resetLocation = React.useCallback(() => {
    onChange({ ...specs, locationLatitude: "", locationLongitude: "" });
    setMapMessage("تمت إعادة ضبط الموقع.");
  }, [onChange, specs]);

  const shareLocation = React.useCallback(
    async (nextLatitude: number, nextLongitude: number) => {
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${nextLatitude},${nextLongitude}`)}`;
      try {
        if (navigator.share) {
          await navigator.share({ title: "موقع العقار", url });
        } else {
          await navigator.clipboard.writeText(url);
          setMapMessage("تم نسخ رابط الموقع.");
        }
      } catch {
        setMapMessage("تعذرت مشاركة الموقع.");
      }
    },
    [],
  );

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {PROPERTY_FIELDS.map(([fieldKey, label, type]) => {
        if (config[fieldKey] === false) return null;
        return (
          <ProductField
            key={fieldKey}
            label={label}
            value={specs[fieldKey as keyof ProductPropertySpecsData] ?? ""}
            mode={mode}
            type={type}
            onChange={(value) => onChange({ ...specs, [fieldKey]: value })}
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
                className="asol-control inline-flex items-center justify-center bg-primary px-5 font-semibold text-on-primary"
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
              {mapOpen ? (
                <AsolMap
                  modes={["picker"]}
                  providers={{ tile: tileProvider }}
                  initialViewport={
                    hasLocation
                      ? {
                          latitude,
                          longitude,
                          zoom: 15,
                          bearing: 0,
                          pitch: 0,
                        }
                      : DEFAULT_LOCATION
                  }
                  markers={
                    hasLocation
                      ? [markerAt(longitude, latitude, "property-location")]
                      : []
                  }
                  toolbar={{
                    save: { enabled: true, label: "حفظ الموقع" },
                    gps: { enabled: true, label: "تحديد الموقع الحالي" },
                    share: { enabled: true, label: "مشاركة الموقع" },
                    reset: { enabled: true, label: "إعادة الضبط" },
                    close: { enabled: true, label: "إغلاق الخريطة" },
                    recenter: { enabled: true, label: "إعادة التمركز" },
                    zoom: { enabled: true, label: "التكبير والتصغير" },
                    compass: { enabled: true, label: "إعادة اتجاه الشمال" },
                    fullscreen: { enabled: true, label: "ملء الشاشة" },
                  }}
                  layers={{ baseMap: true, markers: true, controls: true }}
                  ariaLabel="اختيار موقع العقار"
                  loadingLabel="جارٍ تحميل الخريطة…"
                  retryLabel="إعادة المحاولة"
                  onTap={({
                    latitude: nextLatitude,
                    longitude: nextLongitude,
                  }) => updateLocation(nextLatitude, nextLongitude)}
                  onGpsCompleted={({
                    latitude: nextLatitude,
                    longitude: nextLongitude,
                  }) => updateLocation(nextLatitude, nextLongitude)}
                  onSave={() =>
                    setMapMessage(
                      hasLocation
                        ? "تم تثبيت الموقع داخل بيانات النموذج. استخدم زر حفظ التعديلات أو إنشاء المنتج للحفظ النهائي."
                        : "حدد موقعًا على الخريطة أولًا.",
                    )
                  }
                  onShare={({
                    latitude: nextLatitude,
                    longitude: nextLongitude,
                  }) => void shareLocation(nextLatitude, nextLongitude)}
                  onReset={resetLocation}
                  onClose={() => setMapOpen(false)}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setMapOpen(true)}
                  className="asol-control border border-input px-4 font-medium"
                >
                  فتح الخريطة
                </button>
              )}
              <p className="text-xs text-muted-foreground">
                اضغط على الخريطة لتحديد موقع العقار.
              </p>
              {mapMessage ? (
                <p className="text-xs font-medium text-primary" role="status">
                  {mapMessage}
                </p>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
