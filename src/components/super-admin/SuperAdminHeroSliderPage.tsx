"use client";

import { Eye, History, RefreshCw, Rocket, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { HeroSlider, type HeroSliderConfig } from "@/components/ui/HeroSlider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  HomeHeroPublication,
  HomeHeroRecord,
} from "@/features/advertisements/entities/home-hero-slider.entity";
import { homeHeroSliderApiService } from "@/features/advertisements/services/home-hero-slider-api-service";
import { useSession } from "@/features/auth/components/SessionProvider";
import { isSuperAdmin } from "@/features/auth/utils/super-admin";

const quickIntervals = [5, 15, 30, 60];

export function SuperAdminHeroSliderPage() {
  const router = useRouter();
  const { session, isLoading } = useSession();
  const authorized = isSuperAdmin(session);
  const [record, setRecord] = useState<HomeHeroRecord | null>(null);
  const [publications, setPublications] = useState<HomeHeroPublication[]>([]);
  const [draft, setDraft] = useState<HeroSliderConfig | null>(null);
  const [intervalMinutes, setIntervalMinutes] = useState(15);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session || !isSuperAdmin(session)) return;
    setBusy(true);
    setMessage(null);
    try {
      const [next, history] = await Promise.all([
        homeHeroSliderApiService.getAdmin(session),
        homeHeroSliderApiService.listPublications(session),
      ]);
      setRecord(next);
      setPublications(history);
      setDraft(next.draft);
      setIntervalMinutes(next.checkIntervalMinutes);
    } catch (error) {
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

  const save = async (action: "save-draft" | "publish") => {
    if (!session || !draft || !record) return;
    setBusy(true);
    setMessage(null);
    try {
      const next = await homeHeroSliderApiService.save(
        action,
        session,
        draft,
        intervalMinutes,
        record.revision,
      );
      setRecord(next);
      setDraft(next.draft);
      setMessage(
        action === "publish"
          ? "تم نشر التعديلات على الصفحة الرئيسية."
          : "تم حفظ المسودة.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "تعذر حفظ الإعدادات.",
      );
    } finally {
      setBusy(false);
    }
  };

  const restorePublication = async (publicationId: number) => {
    if (!session || !record) return;
    setBusy(true);
    setMessage(null);
    try {
      const next = await homeHeroSliderApiService.restore(
        session,
        publicationId,
        intervalMinutes,
        record.revision,
      );
      setRecord(next);
      setDraft(next.draft);
      setPublications(await homeHeroSliderApiService.listPublications(session));
      setMessage("The selected publication was restored as a new version.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to restore publication.",
      );
    } finally {
      setBusy(false);
    }
  };

  if (isLoading || !authorized || !draft || !record) {
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
            هذه الإعدادات تتحكم مباشرة في المكوّن المنشور داخل Home.
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

      <section className="mb-4 grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs text-muted-foreground">الحالة</p>
          <p className="font-semibold">
            {record.status === "draft" ? "مسودة" : "منشور"}
          </p>
        </div>
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
        <div>
          <p className="text-xs text-muted-foreground">آخر نشر</p>
          <p className="text-sm">
            {new Date(record.publishedAt).toLocaleString("ar-EG")}
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
        </div>
      </section>

      <div className="mb-3 flex items-center gap-2">
        <Eye className="h-5 w-5 text-primary" />
        <h2 className="font-semibold">المعاينة الحية والتحرير</h2>
      </div>
      <HeroSlider
        mode="admin-edit"
        config={draft}
        onChange={setDraft}
        onCancel={() => setDraft(record.draft)}
      />

      <section className="mt-6 rounded-xl border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Publication history</h2>
        </div>
        {publications.length ? (
          <div className="space-y-2">
            {publications.map((publication) => (
              <div
                key={publication.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2"
              >
                <div className="text-sm">
                  <span className="font-semibold">
                    Version {publication.version}
                  </span>
                  <span className="ms-2 text-muted-foreground">
                    {new Date(publication.publishedAt).toLocaleString("en")}
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy || publication.version === record.version}
                  onClick={() => void restorePublication(publication.id)}
                >
                  Restore
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No previous publications yet.
          </p>
        )}
      </section>

      <div className="sticky bottom-4 mt-6 flex flex-wrap justify-end gap-3 rounded-xl border bg-background/95 p-4 shadow-lg backdrop-blur">
        <Button
          type="button"
          variant="outline"
          onClick={() => setDraft(record.draft)}
          disabled={busy}
        >
          التراجع عن التغييرات
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => void save("save-draft")}
          disabled={busy}
        >
          حفظ كمسودة
        </Button>
        <Button
          type="button"
          onClick={() => void save("publish")}
          disabled={busy}
        >
          <Rocket className="me-2 h-4 w-4" />
          نشر على Home
        </Button>
      </div>
    </main>
  );
}
