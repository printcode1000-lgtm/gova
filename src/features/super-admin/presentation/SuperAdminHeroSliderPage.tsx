"use client";

import { formatDateTimeDefault } from "@asol/format-core";

import { Eye, RefreshCw, Save, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { HeroSlider, type HeroSliderConfig } from "@/components/ui/HeroSlider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  HOME_HERO_CACHE_KEY,
  type HomeHeroRecord,
} from "@asol/hero-slider-core";
import { homeHeroSliderApiService } from "@/features/advertisements/services/home-hero-slider-api-service";
import { useSession } from "@/features/auth/components/SessionProvider";
import { isSuperAdmin } from "@/features/auth/utils/super-admin";
import { reportSystemIssue } from '@asol/system-logs-core';
import type { StorageImageManagerHandle } from "@/features/storage/components/StorageImageManager";
import { ASOL_DB_STORES, asolDbDelete } from "@asol/data-core/browser";

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
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [imagesPending, setImagesPending] = useState(false);
  const imageUploadRef = useRef<StorageImageManagerHandle | null>(null);
  const configRef = useRef<HeroSliderConfig | null>(null);
  configRef.current = config;

  const load = useCallback(async () => {
    if (!session || !isSuperAdmin(session)) return;
    setBusy(true);
    setMessage(null);
    setLoadFailed(false);
    try {
      const next = await homeHeroSliderApiService.getAdmin(session);
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
      setMessage(formatLoadError(error));
    } finally {
      setBusy(false);
    }
  }, [session]);

  useEffect(() => {
    if (!isLoading && !authorized) router.replace(session ? "/home" : "/login");
    if (!isLoading && authorized) void load();
  }, [authorized, isLoading, load, router, session]);

  const save = async () => {
    const currentConfig = configRef.current;
    if (!session || !currentConfig || !record) return;

    setBusy(true);
    setMessage(null);
    try {
      if (imageUploadRef.current?.hasPending()) {
        const uploaded = await imageUploadRef.current.uploadPending();
        if (!uploaded) {
          setMessage("تعذر إكمال رفع الصور. أعد المحاولة ثم احفظ.");
          return;
        }
      }

      const configToSave = configRef.current ?? currentConfig;
      const saved = await homeHeroSliderApiService.save(
        session,
        configToSave,
        intervalMinutes,
      );
      try {
        await asolDbDelete(ASOL_DB_STORES.APP_SETTINGS, HOME_HERO_CACHE_KEY);
      } catch (error) {
        reportSystemIssue({
          level: "warning",
          feature: "HeroSliderAdmin",
          operation: "invalidate-home-cache",
          error,
        });
      }
      setRecord(saved);
      setConfig(saved.config);
      setMessage(
        saved.storageWarning === "imageDeleteFailed"
          ? "تم حفظ التعديلات، لكن تعذر حذف ملف صورة قديم من التخزين."
          : "تم حفظ التعديلات وتطبيقها على الصفحة الرئيسية.",
      );
    } catch (error) {
      reportSystemIssue({
        feature: "HeroSliderAdmin",
        operation: "save",
        error,
      });
      const rawMessage = error instanceof Error ? error.message : "";
      const arabicMessages: Record<string, string> = {
        forbidden: "غير مصرح لك بهذه العملية.",
        invalidHeroSliderConfig:
          "إعداد الشرائح غير صالح، يرجى مراجعة البيانات.",
      };
      const displayMessage =
        arabicMessages[rawMessage] ?? rawMessage ?? "تعذر حفظ الإعدادات.";
      setMessage(displayMessage);
    } finally {
      setBusy(false);
    }
  };

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
              onChange={(event) =>
                setIntervalMinutes(Number(event.target.value))
              }
            />
          </div>
          {quickIntervals.map((interval) => (
            <Button
              key={interval}
              type="button"
              size="sm"
              variant={intervalMinutes === interval ? "default" : "outline"}
              onClick={() => setIntervalMinutes(interval)}
            >
              {interval} دقيقة
            </Button>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() => void load()}
            disabled={busy}
          >
            <RefreshCw className="me-2 h-4 w-4" />
            فحص الآن
          </Button>
          <Button
            type="button"
            onClick={() => void save()}
            disabled={busy || imagesPending}
            className="ms-auto bg-primary text-on-primary"
          >
            <Save className="me-2 h-4 w-4" />
            حفظ
          </Button>
        </div>
      </section>

      <div className="mb-3 flex items-center gap-2">
        <Eye className="h-5 w-5 text-primary" />
        <h2 className="font-semibold">المعاينة الحية والتحرير</h2>
      </div>
      <HeroSlider
        mode="admin-edit"
        config={config}
        onChange={setConfig}
        imageUploadRef={imageUploadRef}
        onImagesPendingChange={setImagesPending}
      />
    </main>
  );
}
