"use client";

import { formatDateTimeDefault } from "@asol/format-core";

import { Eye, RefreshCw, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/shared/ui/button";
import { HeroSlider, type HeroSliderConfig } from "@/features/advertisements/ui";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import type { HomeHeroRecord } from "@asol/hero-slider-core";
import { homeHeroSliderApiService } from "@/features/advertisements";
import { useSession } from "@/features/auth/ui";
import { isSuperAdmin } from "@/features/auth";
import { reportSystemIssue } from '@asol/system-logs-core';
import type { StorageImageManagerHandle } from "@/features/storage/ui";
import { useSuperAdminHeroSliderSave } from "./use-super-admin-hero-slider-save";
import { usePageSaveRegistration } from "@/features/page-save/ui";



const loadErrorMessages: Record<string, string> = {
  forbidden: "غير مصرح لك بهذه العملية.",
};

function formatLoadError(error: unknown): string {
  const rawMessage = error instanceof Error ? error.message : "";
  return loadErrorMessages[rawMessage] ?? rawMessage ?? "تعذر تحميل الإعدادات.";
}

/** Stable authored preset values; one source UID is distinguished by runtime instance. */
const INTERVAL_PRESETS = [5, 15, 30, 60] as const;


export function SuperAdminHeroSliderPage() {
  const router = useRouter();
  const { session, isLoading } = useSession();
  const authorized = isSuperAdmin(session);
  const [record, setRecord] = useState<HomeHeroRecord | null>(null);
  const [config, setConfig] = useState<HeroSliderConfig | null>(null);
  const [intervalMinutes, setIntervalMinutes] = useState(15);
  const [loadBusy, setLoadBusy] = useState(false);
  const [loadMessage, setLoadMessage] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [imagesPending, setImagesPending] = useState(false);
  const imageUploadRef = useRef<StorageImageManagerHandle | null>(null);
  const configRef = useRef<HeroSliderConfig | null>(null);
  const intervalRef = useRef(intervalMinutes);

  configRef.current = config;
  intervalRef.current = intervalMinutes;

  const handleConfigChange = useCallback((next: HeroSliderConfig) => {
    configRef.current = next;
    setConfig(next);
  }, []);

  const handleSaved = useCallback((saved: HomeHeroRecord) => {
    configRef.current = saved.config;
    intervalRef.current = saved.checkIntervalMinutes;
    setRecord(saved);
    setConfig(saved.config);
    setIntervalMinutes(saved.checkIntervalMinutes);
  }, []);

  const {
    busy: saveBusy,
    message: saveMessage,
    uploadPendingImages,
    persistConfig,
    isDirty,
    imagesDirty,
    imagesRemoved,
    imagesConfigDirty,
    canPersist,
    imagesItemCanSave,
    configItemCanSave,
  } = useSuperAdminHeroSliderSave({
    session: authorized ? session : null,
    record,
    config,
    intervalMinutes,
    getConfig: () => configRef.current,
    getIntervalMinutes: () => intervalRef.current,
    imageUploadRef,
    imagesPending,
    onSaved: handleSaved,
  });

  // This console is Arabic-only, so its copy is written here rather than pulled
  // from the public dictionaries. One slide change can mix several operations.
  const imageSaveDescription = useMemo(() => {
    const parts: string[] = [];
    if (imagesPending) parts.push("ترفع الصور المجهزة إلى التخزين");
    if (imagesRemoved) parts.push("تُحذف الصور المزالة من التخزين");
    if (imagesConfigDirty || imagesRemoved || (parts.length === 0 && imagesDirty)) {
      parts.push("تُحفظ إعدادات الشرائح");
    }
    return parts.join(" · ");
  }, [imagesConfigDirty, imagesDirty, imagesPending, imagesRemoved]);

  usePageSaveRegistration({
    id: "super-admin-hero-slider",
    label: "سلايدر الواجهة الرئيسية",
    returnPath: "/super-admin/hero-slider",
    enabled: authorized && !loadFailed && Boolean(record),
    items: [
      {
        id: "hero-slider-images",
        label: "صور السلايدر",
        isDirty: imagesDirty,
        canSave: imagesItemCanSave,
        description: imageSaveDescription,
      },
      {
        id: "hero-slider-config",
        label: "إعدادات السلايدر",
        isDirty,
        canSave: configItemCanSave,
      },
    ],
    isSaving: saveBusy,
    canSave: canPersist,
    prepareForSave: async (selectedItemIds) => {
      const shouldUpload =
        selectedItemIds.includes("hero-slider-images") ||
        selectedItemIds.includes("hero-slider-config");
      if (!shouldUpload) return true;
      return uploadPendingImages();
    },
    save: async (selectedItemIds) => {
      const shouldPersist =
        selectedItemIds.includes("hero-slider-config") ||
        selectedItemIds.includes("hero-slider-images");
      if (!shouldPersist) return true;
      return persistConfig();
    },
  });

  const load = useCallback(async () => {
    if (!session || !isSuperAdmin(session)) return;
    setLoadBusy(true);
    setLoadMessage(null);
    setLoadFailed(false);
    try {
      const next = await homeHeroSliderApiService.getAdmin(session);
      configRef.current = next.config;
      intervalRef.current = next.checkIntervalMinutes;
      setRecord(next);
      setConfig(next.config);
      setIntervalMinutes(next.checkIntervalMinutes);
    } catch (error) {
      reportSystemIssue({
        feature: "HeroSliderAdmin",
        operation: "load-settings",
        error,
      });
      setLoadFailed(true);
      setLoadMessage(formatLoadError(error));
    } finally {
      setLoadBusy(false);
    }
  }, [session]);

  useEffect(() => {
    if (!isLoading && !authorized) router.replace(session ? "/home" : "/login");
    if (!isLoading && authorized) void load();
  }, [authorized, isLoading, load, router, session]);

  const busy = loadBusy || saveBusy;
  const message = loadMessage ?? saveMessage;

  if (isLoading || !authorized) {
    return (
      <main id='features-super-admin-presentation-superadminherosliderpage-main-1-qtozea' className="container px-4 py-8 text-sm text-on-surface-variant">
        جاري التحقق من الصلاحيات…
      </main>
    );
  }

  if (loadFailed) {
    return (
      <main id='features-super-admin-presentation-superadminherosliderpage-main-2-in3om3' className="container mx-auto max-w-6xl px-4 py-8">
        <div id='features-super-admin-presentation-superadminherosliderpage-div-3-gmhubr' className="rounded-lg border border-destructive/30 bg-card px-4 py-6">
          <p id='features-super-admin-presentation-superadminherosliderpage-text-4-zj49qm' className="text-sm text-destructive">{message}</p>
          <Button id='features-super-admin-presentation-superadminherosliderpage-button-5-ut4y2d'
            type="button"
            variant="outline"
            className="mt-4"
            onClick={() => void load()}
            disabled={busy}
          >
            <RefreshCw id='features-super-admin-presentation-superadminherosliderpage-refreshcw-6-r0eib0' className="me-2 h-4 w-4" />
            إعادة المحاولة
          </Button>
        </div>
      </main>
    );
  }

  if (!config || !record) {
    return (
      <main id='features-super-admin-presentation-superadminherosliderpage-main-7-umtebp' className="container px-4 py-8 text-sm text-on-surface-variant">
        جاري تحميل الإعدادات…
      </main>
    );
  }

  return (
    <main id='features-super-admin-presentation-superadminherosliderpage-main-8-vuvzlr' className="container mx-auto max-w-6xl px-4 py-8">
      <header id='features-super-admin-presentation-superadminherosliderpage-header-9-muw1uk' className="mb-6 flex items-start gap-3">
        <div id='features-super-admin-presentation-superadminherosliderpage-div-10-ecgssg' className="rounded-xl bg-primary/10 p-3 text-primary">
          <ShieldCheck id='features-super-admin-presentation-superadminherosliderpage-shieldcheck-11-d8edae' className="h-6 w-6" />
        </div>
        <div id='features-super-admin-presentation-superadminherosliderpage-div-12-tz8fwh'>
          <p id='features-super-admin-presentation-superadminherosliderpage-text-13-n6ee97' className="text-sm font-medium text-primary">منطقة السوبر أدمن</p>
          <h1 id='features-super-admin-presentation-superadminherosliderpage-heading-14-jww9a2' className="text-2xl font-bold">
            إدارة Hero Slider للصفحة الرئيسية
          </h1>
          <p id='features-super-admin-presentation-superadminherosliderpage-text-15-xkrtde' className="mt-1 text-sm text-muted-foreground">
            سجل واحد يتحكم مباشرة في المكوّن داخل Home.
          </p>
        </div>
      </header>

      {message && (
        <div id='features-super-admin-presentation-superadminherosliderpage-div-16-mtbp2x'
          className="mb-4 rounded-lg border bg-card px-4 py-3 text-sm"
          role="status"
        >
          {message}
        </div>
      )}

      <section id='features-super-admin-presentation-superadminherosliderpage-section-17-ifmnci' className="mb-4 grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-3">
        <div id='features-super-admin-presentation-superadminherosliderpage-div-18-txjpj5'>
          <p id='features-super-admin-presentation-superadminherosliderpage-text-19-tmoph3' className="text-xs text-muted-foreground">الإصدار</p>
          <p id='features-super-admin-presentation-superadminherosliderpage-text-20-yuggzj' className="font-semibold">{record.version}</p>
        </div>
        <div id='features-super-admin-presentation-superadminherosliderpage-div-21-s8ukff'>
          <p id='features-super-admin-presentation-superadminherosliderpage-text-22-b9cxon' className="text-xs text-muted-foreground">آخر تحديث</p>
          <p id='features-super-admin-presentation-superadminherosliderpage-text-23-hqclzb' className="text-sm">
            {formatDateTimeDefault(record.updatedAt)}
          </p>
        </div>
      </section>

      <section id='features-super-admin-presentation-superadminherosliderpage-section-24-xt3ybs' className="mb-6 rounded-xl border bg-card p-4">
        <div id='features-super-admin-presentation-superadminherosliderpage-div-25-yzdxhg' className="mb-3 flex items-center gap-2">
          <RefreshCw id='features-super-admin-presentation-superadminherosliderpage-refreshcw-26-rkkufi' className="h-5 w-5 text-primary" />
          <h2 id='features-super-admin-presentation-superadminherosliderpage-heading-27-saxy84' className="font-semibold">فترة البحث عن تحديثات</h2>
        </div>
        <div id='features-super-admin-presentation-superadminherosliderpage-div-28-wwycyt' className="flex flex-wrap items-end gap-3">
          <div id='features-super-admin-presentation-superadminherosliderpage-div-29-h92anz' className="min-w-52 space-y-2">
            <Label id='features-super-admin-presentation-superadminherosliderpage-label-30-18xs4x' htmlFor='features-super-admin-presentation-superadminherosliderpage-input-31-2wrr4v'>الفترة بالدقائق</Label>
            <Input
              id='features-super-admin-presentation-superadminherosliderpage-input-31-2wrr4v'
              type="number"
              min={5}
              max={1440}
              value={intervalMinutes}
              onChange={(event) => {
                const next = Number(event.target.value);
                intervalRef.current = next;
                setIntervalMinutes(next);
              }}
            />
          </div>
          {INTERVAL_PRESETS.map((interval) => (
            <Button
              key={interval}
              type="button"
              size="sm"
              variant={intervalMinutes === interval ? "default" : "outline"}
              onClick={() => {
                intervalRef.current = interval;
                setIntervalMinutes(interval);
              }}
            >
              {interval} دقيقة
            </Button>
          ))}
        </div>
        <p id='features-super-admin-presentation-superadminherosliderpage-text-32-rfa9sl' className="mt-3 text-xs text-muted-foreground">
          المعاينة تعرض كل التعديلات والصور محلياً قبل تطبيقها على الصفحة
          الرئيسية.
        </p>
      </section>

      <div id='features-super-admin-presentation-superadminherosliderpage-div-33-kv6fnd' className="mb-3 flex items-center gap-2">
        <Eye id='features-super-admin-presentation-superadminherosliderpage-eye-34-982khi' className="h-5 w-5 text-primary" />
        <h2 id='features-super-admin-presentation-superadminherosliderpage-heading-35-tapd6h' className="font-semibold">المعاينة الحية والتحرير</h2>
      </div>
      <HeroSlider id='features-super-admin-presentation-superadminherosliderpage-heroslider-36-h4imoc'
        mode="admin-edit"
        config={config}
        onChange={handleConfigChange}
        imageUploadRef={imageUploadRef}
        onImagesPendingChange={setImagesPending}
      />
    </main>
  );
}
