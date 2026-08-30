"use client";

import * as React from "react";
import {
  AsolMap,
  createOpenStreetMapProvider,
  markerAt,
} from "@asol/map-core";
import type { ProductPropertySpecsData } from "@/features/product";
import { ProductField } from "./ProductComponentPrimitives";
import type {
  ProductComponentConfig,
  ProductMode,
} from "./product-component.types";
import { isCancelledError } from '@asol/native-core';
import { shareLocationUrl } from "@/features/sharing/ui";
import {
  googleMapsSearchUrl,
  openDeviceMaps,
} from "@/features/location";
import { createOpaqueUiInstanceId, uiAttributes, type UiInstanceId } from "@asol/ui-registry-core";

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

export function ProductPropertySpecs({ id,
  mode,
  config,
  specs,
  onChange,
  instance,
}: {
  mode: ProductMode;
  config: ProductComponentConfig;
  specs: ProductPropertySpecsData;
  onChange: (specs: ProductPropertySpecsData) => void;
  instance?: UiInstanceId;
} & { id?: string }) {
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
      setMapMessage("تم اختيار الموقع.");
    },
    [onChange, specs],
  );

  /**
   * The map balloon carries the coordinates and the address the user typed for them
   * in one confirmed action, so both land in the form together and cannot drift.
   */
  const commitLocation = React.useCallback(
    (nextLatitude: number, nextLongitude: number, address: string) => {
      onChange({
        ...specs,
        locationLatitude: String(nextLatitude),
        locationLongitude: String(nextLongitude),
        address,
      });
    },
    [onChange, specs],
  );

  const resetLocation = React.useCallback(() => {
    onChange({ ...specs, locationLatitude: "", locationLongitude: "" });
    setMapMessage("تمت إعادة ضبط الموقع.");
  }, [onChange, specs]);

  const shareLocation = React.useCallback(
    async (nextLatitude: number, nextLongitude: number) => {
      const url = googleMapsSearchUrl(nextLatitude, nextLongitude);
      // The shared helper also copies the link when sharing is unavailable or
      // fails, so the user is never left without a way to keep the location.
      await shareLocationUrl(
        url,
        "موقع العقار",
        () => setMapMessage("تم نسخ رابط الموقع."),
        () => setMapMessage("تعذرت مشاركة الموقع."),
      );
    },
    [],
  );

  const resolvedInstance = id ? createOpaqueUiInstanceId("property-specs", id) : instance;

  return (
    <div {...uiAttributes({ uid: "product.product-property-specs.div-f0DkQh", id: "product.product-property-specs.div", instance: resolvedInstance })} id={id} className="grid gap-3 sm:grid-cols-2">
      {PROPERTY_FIELDS.map(([fieldKey, label, type]) => {
        if (config[fieldKey] === false) return null;
        return (
          <ProductField id={id ? `${id}.${fieldKey}` : fieldKey}
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
        <div {...uiAttributes({ uid: "product.product-property-specs.div.2-Mltx57", id: "product.product-property-specs.div.2", instance: resolvedInstance })} className="sm:col-span-2">
          <p {...uiAttributes({ uid: "product.product-property-specs.p-C6dKZE", id: "product.product-property-specs.p", instance: resolvedInstance })} className="mb-2 text-sm font-medium">الموقع</p>
          {mode === "view" ? (
            hasLocation ? (
              <button {...uiAttributes({ uid: "product.product-property-specs.button-CyKN7F", id: "product.product-property-specs.button", instance: resolvedInstance })}
                type="button"
                onClick={() => openDeviceMaps(latitude, longitude)}
                className="asol-control inline-flex items-center justify-center bg-primary px-5 font-semibold text-on-primary"
              >
                فتح الموقع في الخرائط
              </button>
            ) : (
              <div {...uiAttributes({ uid: "product.product-property-specs.div.3-B2ehwN", id: "product.product-property-specs.div.3", instance: resolvedInstance })} className="rounded-xl bg-muted/40 px-3 py-2.5 text-muted-foreground">
                لم يتم تحديد الموقع.
              </div>
            )
          ) : (
            <div {...uiAttributes({ uid: "product.product-property-specs.div.4-46LIrS", id: "product.product-property-specs.div.4", instance: resolvedInstance })} className="space-y-2">
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
                  addressPrompt={{
                    enabled: true,
                    title: "عنوان العقار",
                    placeholder: "اكتب وصف العنوان",
                    confirmLabel: "تأكيد",
                    cancelLabel: "إلغاء",
                    value: specs.address ?? "",
                  }}
                  onLocationCommitted={({ latitude: nextLatitude, longitude: nextLongitude, address }) =>
                    commitLocation(nextLatitude, nextLongitude, address)
                  }
                  onTap={({
                    latitude: nextLatitude,
                    longitude: nextLongitude,
                  }) => updateLocation(nextLatitude, nextLongitude)}
                  onGpsCompleted={({
                    latitude: nextLatitude,
                    longitude: nextLongitude,
                  }) => updateLocation(nextLatitude, nextLongitude)}
                  onGpsError={(mapError) =>
                    setMapMessage(
                      mapError.code !== "permission"
                        ? "تعذر تحديد موقعك الحالي. حدد الموقع على الخريطة."
                        : mapError.requiresSettings
                          ? "إذن الموقع محظور. فعّله من إعدادات التطبيق ثم أعد المحاولة."
                          : mapError.permissionState === "unsupported"
                            ? "تحديد الموقع غير مدعوم على هذا الجهاز. حدد الموقع على الخريطة."
                            : "لم يُمنح إذن الموقع. اسمح بالوصول أو حدد الموقع على الخريطة.",
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
                <button {...uiAttributes({ uid: "product.product-property-specs.button.2-I5HXna", id: "product.product-property-specs.button.2", instance: resolvedInstance })}
                  type="button"
                  onClick={() => setMapOpen(true)}
                  className="asol-control border border-input px-4 font-medium"
                >
                  فتح الخريطة
                </button>
              )}
              {mapMessage ? (
                <p {...uiAttributes({ uid: "product.product-property-specs.p.2-fBd612", id: "product.product-property-specs.p.2", instance: resolvedInstance })} className="text-xs font-medium text-primary" role="status">
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
