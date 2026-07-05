"use client";

import {
  Eye,
  GripVertical,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { TrendingRibbon } from "@/components/ui/TrendingRibbon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  TRENDING_RIBBON_CACHE_KEY,
  type TrendingRibbonRecord,
} from "@/features/advertisements/entities/trending-ribbon.entity";
import { trendingRibbonApiService } from "@/features/advertisements/services/trending-ribbon-api-service";
import { useSession } from "@/features/auth/components/SessionProvider";
import { isSuperAdmin } from "@/features/auth/utils/super-admin";
import { GOVA_DB_STORES, govaDbDelete } from "@/lib/gova-db";
import { reportSystemIssue } from "@/features/system-logs/report-system-issue";

// ─── Types ───────────────────────────────────────────────────────────────────

interface FormItem {
  label: string;
  action: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SuperAdminTrendingRibbonPage() {
  const router = useRouter();
  const { session, isLoading: sessionLoading } = useSession();
  const authorized = isSuperAdmin(session);

  const [record, setRecord] = useState<TrendingRibbonRecord | null>(null);
  const [badgeLabel, setBadgeLabel] = useState("home.trending.label");
  const [items, setItems] = useState<FormItem[]>([]);
  const [newItemLabel, setNewItemLabel] = useState("");
  const [newItemAction, setNewItemAction] = useState("");
  const [intervalMinutes, setIntervalMinutes] = useState(15);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  const dragIndex = useRef<number | null>(null);

  // ── Auth guard ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!sessionLoading && !authorized) {
      router.replace(session ? "/home" : "/login");
    }
  }, [authorized, session, sessionLoading, router]);

  // ── Load admin record ───────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!session || !isSuperAdmin(session)) return;
    setBusy(true);
    setMessage(null);
    try {
      const next = await trendingRibbonApiService.getAdmin(session);
      setRecord(next);
      setBadgeLabel(next.config.label || "home.trending.label");
      setItems(next.config.items || []);
      setIntervalMinutes(next.checkIntervalMinutes);
    } catch (error) {
      reportSystemIssue({
        feature: "TrendingRibbonAdmin",
        operation: "load-settings",
        error,
      });
      setMessage(
        error instanceof Error ? error.message : "تعذر تحميل الإعدادات.",
      );
      setMessageType("error");
    } finally {
      setBusy(false);
    }
  }, [session]);

  useEffect(() => {
    if (!sessionLoading && authorized) void load();
  }, [authorized, sessionLoading, load]);

  // ── Add Item ────────────────────────────────────────────────────────────────

  const addItem = () => {
    const labelTrimmed = newItemLabel.trim();
    const actionTrimmed = newItemAction.trim();
    if (!labelTrimmed || !actionTrimmed) {
      setMessage("يرجى ملء كلا الحقلين: النص والإجراء.");
      setMessageType("error");
      return;
    }
    setItems((prev) => [...prev, { label: labelTrimmed, action: actionTrimmed }]);
    setNewItemLabel("");
    setNewItemAction("");
    setMessage(null);
  };

  // ── Remove Item ─────────────────────────────────────────────────────────────

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Drag-and-drop reorder ───────────────────────────────────────────────────

  const handleDragStart = (index: number) => {
    dragIndex.current = index;
  };

  const handleDragOver = (e: React.DragEvent, overIndex: number) => {
    e.preventDefault();
    const from = dragIndex.current;
    if (from === null || from === overIndex) return;
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(overIndex, 0, moved);
      return next;
    });
    dragIndex.current = overIndex;
  };

  const handleDragEnd = () => {
    dragIndex.current = null;
  };

  // ── Save ────────────────────────────────────────────────────────────────────

  const save = async () => {
    if (!session || !record) return;
    setBusy(true);
    setMessage(null);
    try {
      const saved = await trendingRibbonApiService.save(
        session,
        {
          label: badgeLabel.trim(),
          items: items.map((item) => ({
            label: item.label.trim(),
            action: item.action.trim(),
          })),
        },
        intervalMinutes,
      );
      // Invalidate IndexedDB cache so that the home page updates immediately
      try {
        await govaDbDelete(GOVA_DB_STORES.APP_SETTINGS, TRENDING_RIBBON_CACHE_KEY);
      } catch (err) {
        console.error("Failed to delete local trending ribbon cache:", err);
      }
      setRecord(saved);
      setMessage("تم حفظ التعديلات وتطبيقها على الصفحة الرئيسية.");
      setMessageType("success");
    } catch (error) {
      reportSystemIssue({
        feature: "TrendingRibbonAdmin",
        operation: "save",
        error,
      });
      const rawMessage = error instanceof Error ? error.message : "";
      const arabicMessages: Record<string, string> = {
        forbidden: "غير مصرح لك بهذه العملية.",
        invalidTrendingRibbonConfig: "إعداد شريط النصوص غير صالح، يرجى مراجعة البيانات.",
      };
      setMessage(
        arabicMessages[rawMessage] ?? rawMessage ?? "تعذر حفظ الإعدادات.",
      );
      setMessageType("error");
    } finally {
      setBusy(false);
    }
  };

  // ── Preview config ──────────────────────────────────────────────────────────

  const previewConfig = {
    label: badgeLabel,
    items: items,
  };

  // ── Loading / auth ──────────────────────────────────────────────────────────

  if (sessionLoading || !authorized || !record) {
    return (
      <main className="container px-4 py-8 text-sm text-on-surface-variant">
        جاري التحقق وتحميل الإعدادات…
      </main>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <main className="container mx-auto max-w-4xl px-4 py-8">
      {/* ── Header ── */}
      <header className="mb-6 flex items-start gap-3">
        <div className="rounded-xl bg-primary/10 p-3 text-primary">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-primary">منطقة السوبر أدمن</p>
          <h1 className="text-2xl font-bold">
            إدارة شريط النصوص المتحرك (TrendingRibbon)
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            أضف أي عدد من النصوص والروابط التفاعلية للعرض في الصفحة الرئيسية.
          </p>
        </div>
      </header>

      {/* ── Meta ── */}
      <section className="mb-4 grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2">
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

      {/* ── Check Interval ── */}
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
          {[5, 15, 30, 60].map((interval) => (
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

      {/* ── Message ── */}
      {message && (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
            messageType === "success"
              ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
          role="status"
        >
          {message}
        </div>
      )}

      {/* ── Badge Settings ── */}
      <section className="mb-6 rounded-xl border bg-card p-4">
        <div className="mb-3 space-y-2">
          <Label htmlFor="badge-label-input" className="font-semibold text-base block">
            شارة العنوان (Badge Label)
          </Label>
          <Input
            id="badge-label-input"
            placeholder="مثال: home.trending.label أو الأكثر طلباً"
            value={badgeLabel}
            onChange={(e) => setBadgeLabel(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            النص المعروض في المربع الملون قبل الشريط. يدعم مفاتيح الترجمة أو النصوص المباشرة.
          </p>
        </div>
      </section>

      {/* ── Add Item ── */}
      <section className="mb-6 rounded-xl border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Plus className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">إضافة نص جديد للشريط</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="new-item-label">النص المعروض</Label>
            <Input
              id="new-item-label"
              placeholder="مثال: خصم 20% على العطور"
              value={newItemLabel}
              onChange={(e) => setNewItemLabel(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-item-action">الإجراء / الرابط</Label>
            <Input
              id="new-item-action"
              placeholder="مثال: /profile أو معرف المنتج"
              value={newItemAction}
              onChange={(e) => setNewItemAction(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addItem();
              }}
            />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button
            type="button"
            onClick={addItem}
            disabled={!newItemLabel.trim() || !newItemAction.trim()}
          >
            <Plus className="me-1 h-4 w-4" />
            إضافة إلى القائمة
          </Button>
        </div>
      </section>

      {/* ── Items List ── */}
      <section className="mb-6 rounded-xl border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">النصوص المضافة ({items.length})</h2>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void load()}
              disabled={busy}
            >
              <RefreshCw className="me-1 h-3 w-3" />
              تحديث
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => void save()}
              disabled={busy || items.length === 0}
              className="bg-primary text-on-primary hover:bg-primary/95"
            >
              {busy ? (
                <Loader2 className="me-1 h-3 w-3 animate-spin" />
              ) : (
                <Save className="me-1 h-3 w-3" />
              )}
              حفظ
            </Button>
          </div>
        </div>

        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            لا توجد نصوص مضافة حالياً. أضف عناصر جديدة أعلاه.
          </p>
        ) : (
          <div className="space-y-2">
            {items.map((item, index) => (
              <div
                key={`${item.label}-${index}`}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className="flex items-center gap-3 rounded-lg border bg-surface p-3 transition-colors hover:border-primary/30"
              >
                <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.label}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    الإجراء: <code>{item.action}</code>
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  #{index + 1}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => removeItem(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {items.length > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            اسحب العناصر لإعادة الترتيب. لا تنس الضغط على زر الحفظ لتطبيق التغييرات.
          </p>
        )}
      </section>

      {/* ── Live Preview ── */}
      {items.length > 0 && (
        <section className="rounded-xl border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">المعاينة الحية</h2>
          </div>
          <div className="gova-section-tonal gova-section-tonal-primary mx-1 rounded-xl p-4">
            <TrendingRibbon config={previewConfig} />
          </div>
        </section>
      )}
    </main>
  );
}
