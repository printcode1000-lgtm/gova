"use client";

import { Eye, RefreshCw, Save, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { HeroSlider, type HeroSliderConfig } from "@/components/ui/HeroSlider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { HomeHeroRecord } from "@/features/advertisements/entities/home-hero-slider.entity";
import { homeHeroSliderApiService } from "@/features/advertisements/services/home-hero-slider-api-service";
import { useSession } from "@/features/auth/components/SessionProvider";
import { isSuperAdmin } from "@/features/auth/utils/super-admin";
import { reportSystemIssue } from "@/features/system-logs/report-system-issue";
import { GOVA_DB_STORES, govaDbDelete } from "@/lib/gova-db";

const quickIntervals = [5, 15, 30, 60];

export function SuperAdminHeroSliderPage() {
  const router = useRouter();
  const { session, isLoading } = useSession();
  const authorized = isSuperAdmin(session);
  const [record, setRecord] = useState<HomeHeroRecord | null>(null);
  const [config, setConfig] = useState<HeroSliderConfig | null>(null);
  const [intervalMinutes, setIntervalMinutes] = useState(15);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session || !isSuperAdmin(session)) return;
    setBusy(true);
    setMessage(null);
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
      setMessage(
        error instanceof Error ? error.message : "تعذر تحميل الإعدادات.",
      );
    } finally {
      setBusy(false);
    }
  }, [session]);

  useEffect(() => {
    if (!isLoading && !authorized) router.replace(session ? "/home" : "/login");
    if (!isLoading && authorized) void load();
  }, [authorized, isLoading, load, router, session]);

  const save = async () => {
    if (!session || !config || !record) return;
    setBusy(true);
    setMessage(null);
    try {
      const saved = await homeHeroSliderApiService.save(
        session,
        config,
        intervalMinutes,
      );
      // Invalidate IndexedDB cache so that the home page slider updates immediately
      try {
        await govaDbDelete(
          GOVA_DB_STORES.APP_SETTINGS,
          "advertisements:home-hero-slider:v2",
        );
      } catch (err) {
        console.error("Failed to delete local slider cache:", err);
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

  if (isLoading || !authorized || !config || !record) {
    return (
      <main className="container px-4 py-8 text-sm text-on-surface-variant">
        جاري التحقق وتحميل الإعدادات…
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
            {new Date(record.updatedAt).toLocaleString("ar-EG")}
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
            disabled={busy}
            className="ms-auto bg-primary text-on-primary hover:bg-primary/95"
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
      <HeroSlider mode="admin-edit" config={config} onChange={setConfig} />
    </main>
  );
}
