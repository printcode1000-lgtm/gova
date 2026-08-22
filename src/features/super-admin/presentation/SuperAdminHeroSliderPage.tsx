"use client";

import { formatDateTimeDefault } from "@asol/format-core";

import { Eye, RefreshCw, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { HeroSlider, type HeroSliderConfig } from "@/components/ui/HeroSlider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { HomeHeroRecord } from "@asol/hero-slider-core";
import { homeHeroSliderApiService } from "@/features/advertisements/services/home-hero-slider-api-service";
import { useSession } from "@/features/auth/components/SessionProvider";
import { isSuperAdmin } from "@/features/auth/utils/super-admin";
import { reportSystemIssue } from '@asol/system-logs-core';
import type { StorageImageManagerHandle } from "@/features/storage/components/StorageImageManager";
import { useSuperAdminHeroSliderSave } from "./use-super-admin-hero-slider-save";
import { usePageSaveRegistration } from "@/features/page-save/hooks/use-page-save-registration";

const quickIntervals = [5, 15, 30, 60];

const loadErrorMessages: Record<string, string> = {
  forbidden: "غير مصرح لك بهذه العملية.",
};

function formatLoadError(error: unknown): string {
  const rawMessage = error instanceof Error ? error.message : "";
  return loadErrorMessages[rawMessage] ?? rawMessage ?? "تعذر تحميل الإعدادات.";
}

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
      <main className="container px-4 py-8 text-sm text-on-surface-variant">
        جاري التحقق من الصلاحيات…
      </main>
    );
  }

  if (loadFailed) {
    return (
      <main className="container mx-auto max-w-6xl px-4 py-8">
        <div className="rounded-lg border border-destructive/30 bg-card px-4 py-6">
          <p className="text-sm text-destructive">{message}</p>
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={() => void load()}
            disabled={busy}
          >
            <RefreshCw className="me-2 h-4 w-4" />
            إعادة المحاولة
          </Button>
        </div>
      </main>
    );
  }

  if (!config || !record) {
    return (
      <main className="container px-4 py-8 text-sm text-on-surface-variant">
        جاري تحميل الإعدادات…
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex items-start gap-3">
        <div className="rounded-xl bg-primary/10 p-3 text-primary">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-primary">منطقة السوبر أدمن</p>
          <h1 className="text-2xl font-bold">
            إدارة Hero Slider للصفحة الرئيسية
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            سجل واحد يتحكم مباشرة في المكوّن داخل Home.
          </p>
        </div>
      </header>

      {message && (
        <div
          className="mb-4 rounded-lg border bg-card px-4 py-3 text-sm"
          role="status"
        >
          {message}
        </div>
      )}

      <section className="mb-4 grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <p className="text-xs text-muted-foreground">الإصدار</p>
          <p className="font-semibold">{record.version}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">آخر تحديث</p>
          <p className="text-sm">
            {formatDateTimeDefault(record.updatedAt)}
          </p>
        </div>
      </section>

      <section className="mb-6 rounded-xl border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">فترة البحث عن تحديثات</h2>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-52 space-y-2">
            <Label htmlFor="check-interval">الفترة بالدقائق</Label>
            <Input
              id="check-interval"
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
          {quickIntervals.map((interval) => (
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
        <p className="mt-3 text-xs text-muted-foreground">
          المعاينة تعرض كل التعديلات والصور محلياً قبل تطبيقها على الصفحة
          الرئيسية.
        </p>
      </section>

      <div className="mb-3 flex items-center gap-2">
        <Eye className="h-5 w-5 text-primary" />
        <h2 className="font-semibold">المعاينة الحية والتحرير</h2>
      </div>
      <HeroSlider
        mode="admin-edit"
        config={config}
        onChange={handleConfigChange}
        imageUploadRef={imageUploadRef}
        onImagesPendingChange={setImagesPending}
      />
    </main>
  );
}
