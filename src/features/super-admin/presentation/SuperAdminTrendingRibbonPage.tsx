"use client";

import { formatDateTimeDefault } from "@asol/format-core";

import {
  Eye,
  GripVertical,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { TrendingRibbon } from "@/features/advertisements/ui";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  TRENDING_RIBBON_CACHE_KEY,
  TRENDING_RIBBON_FALLBACK_LABEL,
  type TrendingRibbonRecord,
} from "@asol/trending-ribbon-core";
import { trendingRibbonApiService } from "@/features/advertisements";
import { useSession } from "@/features/auth/ui";
import { isSuperAdmin } from "@/features/auth";
import { ASOL_DB_STORES, asolDbDelete } from "@asol/data-core/browser";
import { reportSystemIssue } from '@asol/system-logs-core';
import { usePageSaveRegistration } from "@/features/page-save/ui";

// ─── Types ───────────────────────────────────────────────────────────────────

interface FormItem {
  label: string;
  action: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

/** Stable authored preset values; one source UID is distinguished by runtime instance. */
const INTERVAL_PRESETS = [5, 15, 30, 60] as const;


export function SuperAdminTrendingRibbonPage() {
  const router = useRouter();
  const { session, isLoading: sessionLoading } = useSession();
  const authorized = isSuperAdmin(session);

  const [record, setRecord] = useState<TrendingRibbonRecord | null>(null);
  const [badgeLabel, setBadgeLabel] = useState(TRENDING_RIBBON_FALLBACK_LABEL);
  const [items, setItems] = useState<FormItem[]>([]);
  const [newItemLabel, setNewItemLabel] = useState("");
  const [newItemAction, setNewItemAction] = useState("");
  const [intervalMinutes, setIntervalMinutes] = useState(15);
  const [busy, setBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
      setBadgeLabel(next.config.label || TRENDING_RIBBON_FALLBACK_LABEL);
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

  const save = async (): Promise<boolean> => {
    if (!session || !record) return false;
    setSaveBusy(true);
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
        await asolDbDelete(ASOL_DB_STORES.APP_SETTINGS, TRENDING_RIBBON_CACHE_KEY);
      } catch (err) {
        console.error("Failed to delete local trending ribbon cache:", err);
      }
      setRecord(saved);
      return true;
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
        arabicMessages[rawMessage] ?? rawMessage ?? "",
      );
      return false;
    } finally {
      setSaveBusy(false);
    }
  };

  const savedFingerprint = record
    ? JSON.stringify({
        label: record.config.label,
        items: record.config.items,
        intervalMinutes: record.checkIntervalMinutes,
      })
    : "";
  const currentFingerprint = JSON.stringify({
    label: badgeLabel.trim(),
    items: items.map((item) => ({
      label: item.label.trim(),
      action: item.action.trim(),
    })),
    intervalMinutes,
  });
  const isRibbonDirty =
    Boolean(record) && currentFingerprint !== savedFingerprint;

  usePageSaveRegistration({
    id: "super-admin-trending-ribbon",
    label: "شريط الأخبار",
    returnPath: "/super-admin/trending-ribbon",
    enabled: authorized && Boolean(record),
    items: [
      {
        id: "trending-ribbon",
        label: "عناصر الشريط",
        isDirty: isRibbonDirty,
        canSave: isRibbonDirty && !saveBusy && items.length > 0,
      },
    ],
    isSaving: saveBusy,
    canSave: isRibbonDirty && !saveBusy && items.length > 0,
    save: async (selectedItemIds) => {
      if (!selectedItemIds.includes("trending-ribbon")) return true;
      return save();
    },
  });

  // ── Preview config ──────────────────────────────────────────────────────────

  const previewConfig = {
    label: badgeLabel,
    items: items,
  };

  // ── Loading / auth ──────────────────────────────────────────────────────────

  if (sessionLoading || !authorized || !record) {
    return (
      <main id='features-super-admin-presentation-superadmintrendingribbonpage-main-1-t04iz3' className="container px-4 py-8 text-sm text-on-surface-variant">
        جاري التحقق وتحميل الإعدادات…
      </main>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <main id='features-super-admin-presentation-superadmintrendingribbonpage-main-2-drdy11' className="container mx-auto max-w-4xl px-4 py-8">
      {/* ── Header ── */}
      <header id='features-super-admin-presentation-superadmintrendingribbonpage-header-3-bqyuqt' className="mb-6 flex items-start gap-3">
        <div id='features-super-admin-presentation-superadmintrendingribbonpage-div-4-l1evms' className="rounded-xl bg-primary/10 p-3 text-primary">
          <ShieldCheck id='features-super-admin-presentation-superadmintrendingribbonpage-shieldcheck-5-sijiz6' className="h-6 w-6" />
        </div>
        <div id='features-super-admin-presentation-superadmintrendingribbonpage-div-6-oa0bhi'>
          <p id='features-super-admin-presentation-superadmintrendingribbonpage-text-7-zbw2oa' className="text-sm font-medium text-primary">منطقة السوبر أدمن</p>
          <h1 id='features-super-admin-presentation-superadmintrendingribbonpage-heading-8-w0lbj9' className="text-2xl font-bold">
            إدارة شريط النصوص المتحرك (TrendingRibbon)
          </h1>
          <p id='features-super-admin-presentation-superadmintrendingribbonpage-text-9-smppqc' className="mt-1 text-sm text-muted-foreground">
            أضف أي عدد من النصوص والروابط التفاعلية للعرض في الصفحة الرئيسية.
          </p>
        </div>
      </header>

      {/* ── Meta ── */}
      <section id='features-super-admin-presentation-superadmintrendingribbonpage-section-10-jad16v' className="mb-4 grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2">
        <div id='features-super-admin-presentation-superadmintrendingribbonpage-div-11-dxk9g0'>
          <p id='features-super-admin-presentation-superadmintrendingribbonpage-text-12-rzk01b' className="text-xs text-muted-foreground">الإصدار</p>
          <p id='features-super-admin-presentation-superadmintrendingribbonpage-text-13-28ngo2' className="font-semibold">{record.version}</p>
        </div>
        <div id='features-super-admin-presentation-superadmintrendingribbonpage-div-14-u5upxa'>
          <p id='features-super-admin-presentation-superadmintrendingribbonpage-text-15-cmgs4o' className="text-xs text-muted-foreground">آخر تحديث</p>
          <p id='features-super-admin-presentation-superadmintrendingribbonpage-text-16-cltmzp' className="text-sm">
            {formatDateTimeDefault(record.updatedAt)}
          </p>
        </div>
      </section>

      {/* ── Check Interval ── */}
      <section id='features-super-admin-presentation-superadmintrendingribbonpage-section-17-8gbaka' className="mb-6 rounded-xl border bg-card p-4">
        <div id='features-super-admin-presentation-superadmintrendingribbonpage-div-18-n5ydgy' className="mb-3 flex items-center gap-2">
          <RefreshCw id='features-super-admin-presentation-superadmintrendingribbonpage-refreshcw-19-wxgqx5' className="h-5 w-5 text-primary" />
          <h2 id='features-super-admin-presentation-superadmintrendingribbonpage-heading-20-njwy9u' className="font-semibold">فترة البحث عن تحديثات</h2>
        </div>
        <div id='features-super-admin-presentation-superadmintrendingribbonpage-div-21-bnkbco' className="flex flex-wrap items-end gap-3">
          <div id='features-super-admin-presentation-superadmintrendingribbonpage-div-22-0vyw7q' className="min-w-52 space-y-2">
            <Label id='features-super-admin-presentation-superadmintrendingribbonpage-label-23-0qgmcs' htmlFor='features-super-admin-presentation-superadmintrendingribbonpage-input-24-wbe5uc'>الفترة بالدقائق</Label>
            <Input
              id='features-super-admin-presentation-superadmintrendingribbonpage-input-24-wbe5uc'
              type="number"
              min={5}
              max={1440}
              value={intervalMinutes}
              onChange={(event) =>
                setIntervalMinutes(Number(event.target.value))
              }
            />
          </div>
          {INTERVAL_PRESETS.map((interval) => (
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
          <Button id='features-super-admin-presentation-superadmintrendingribbonpage-button-25-lcjejd'
            type="button"
            variant="outline"
            onClick={() => void load()}
            disabled={busy}
          >
            <RefreshCw id='features-super-admin-presentation-superadmintrendingribbonpage-refreshcw-26-sluxcr' className="me-2 h-4 w-4" />
            فحص الآن
          </Button>
        </div>
      </section>

      {/* ── Message ── */}
      {message && (
        <div id='features-super-admin-presentation-superadmintrendingribbonpage-div-27-buvpbt'
          className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="status"
        >
          {message}
        </div>
      )}

      {/* ── Badge Settings ── */}
      <section id='features-super-admin-presentation-superadmintrendingribbonpage-section-28-zx41qq' className="mb-6 rounded-xl border bg-card p-4">
        <div id='features-super-admin-presentation-superadmintrendingribbonpage-div-29-up1g6a' className="mb-3 space-y-2">
          <Label id='features-super-admin-presentation-superadmintrendingribbonpage-label-30-92rzz7' htmlFor='features-super-admin-presentation-superadmintrendingribbonpage-input-31-ain0d9' className="font-semibold text-base block">
            شارة العنوان (Badge Label)
          </Label>
          <Input
            id='features-super-admin-presentation-superadmintrendingribbonpage-input-31-ain0d9'
            placeholder="مثال: home.trending.label أو الأكثر طلباً"
            value={badgeLabel}
            onChange={(e) => setBadgeLabel(e.target.value)}
          />
          <p id='features-super-admin-presentation-superadmintrendingribbonpage-text-32-pvo1d5' className="text-xs text-muted-foreground">
            النص المعروض في المربع الملون قبل الشريط. يدعم مفاتيح الترجمة أو النصوص المباشرة.
          </p>
        </div>
      </section>

      {/* ── Add Item ── */}
      <section id='features-super-admin-presentation-superadmintrendingribbonpage-section-33-bl3vyy' className="mb-6 rounded-xl border bg-card p-4">
        <div id='features-super-admin-presentation-superadmintrendingribbonpage-div-34-920dim' className="mb-3 flex items-center gap-2">
          <Plus id='features-super-admin-presentation-superadmintrendingribbonpage-plus-35-jp1cqj' className="h-5 w-5 text-primary" />
          <h2 id='features-super-admin-presentation-superadmintrendingribbonpage-heading-36-3ibcn0' className="font-semibold">إضافة نص جديد للشريط</h2>
        </div>
        <div id='features-super-admin-presentation-superadmintrendingribbonpage-div-37-qpk7up' className="grid gap-4 sm:grid-cols-2">
          <div id='features-super-admin-presentation-superadmintrendingribbonpage-div-38-oyorrk' className="space-y-1">
            <Label id='features-super-admin-presentation-superadmintrendingribbonpage-label-39-mlcpns' htmlFor='features-super-admin-presentation-superadmintrendingribbonpage-input-40-kgldsr'>النص المعروض</Label>
            <Input
              id='features-super-admin-presentation-superadmintrendingribbonpage-input-40-kgldsr'
              placeholder="مثال: خصم 20% على العطور"
              value={newItemLabel}
              onChange={(e) => setNewItemLabel(e.target.value)}
            />
          </div>
          <div id='features-super-admin-presentation-superadmintrendingribbonpage-div-41-i1pgp8' className="space-y-1">
            <Label id='features-super-admin-presentation-superadmintrendingribbonpage-label-42-vz3u7m' htmlFor="new-item-action">الإجراء / الرابط</Label>
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
        <div id='features-super-admin-presentation-superadmintrendingribbonpage-div-44-27revj' className="mt-3 flex justify-end">
          <Button id='features-super-admin-presentation-superadmintrendingribbonpage-button-45-hbdawg'
            type="button"
            onClick={addItem}
            disabled={!newItemLabel.trim() || !newItemAction.trim()}
          >
            <Plus id='features-super-admin-presentation-superadmintrendingribbonpage-plus-46-4km1hv' className="me-1 h-4 w-4" />
            إضافة إلى القائمة
          </Button>
        </div>
      </section>

      {/* ── Items List ── */}
      <section id='features-super-admin-presentation-superadmintrendingribbonpage-section-47-119p5q' className="mb-6 rounded-xl border bg-card p-4">
        <div id='features-super-admin-presentation-superadmintrendingribbonpage-div-48-rn4lbh' className="mb-3 flex items-center justify-between">
          <h2 id='features-super-admin-presentation-superadmintrendingribbonpage-heading-49-rierp5' className="font-semibold">النصوص المضافة ({items.length})</h2>
          <div id='features-super-admin-presentation-superadmintrendingribbonpage-div-50-b7q2kk' className="flex gap-2">
            <Button id='features-super-admin-presentation-superadmintrendingribbonpage-button-51-g2w3bh'
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void load()}
              disabled={busy}
            >
              <RefreshCw id='features-super-admin-presentation-superadmintrendingribbonpage-refreshcw-52-nzcdxh' className="me-1 h-3 w-3" />
              تحديث
            </Button>
          </div>
        </div>

        {items.length === 0 ? (
          <p id='features-super-admin-presentation-superadmintrendingribbonpage-text-53-swujqq' className="py-6 text-center text-sm text-muted-foreground">
            لا توجد نصوص مضافة حالياً. أضف عناصر جديدة أعلاه.
          </p>
        ) : (
          <div id='features-super-admin-presentation-superadmintrendingribbonpage-div-54-6gtpjv' className="space-y-2">
            {items.map((item, index) => {
              return (
                <div
                  key={`${item.action}-${item.label}`}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className="flex items-center gap-3 rounded-lg border bg-surface p-3 transition-colors"
                >
                  <span
                    data-drag-handle
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    role="button"
                    aria-label="اسحب لإعادة الترتيب"
                    className="shrink-0 touch-none"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </span>
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
                    className="shrink-0 text-destructive"
                    onClick={() => removeItem(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {items.length > 0 && (
          <p id='features-super-admin-presentation-superadmintrendingribbonpage-text-55-epac21' className="mt-3 text-xs text-muted-foreground">
            اسحب العناصر لإعادة الترتيب.
          </p>
        )}
      </section>

      {/* ── Live Preview ── */}
      {items.length > 0 && (
        <section id='features-super-admin-presentation-superadmintrendingribbonpage-section-56-rordbk' className="rounded-xl border bg-card p-4">
          <div id='features-super-admin-presentation-superadmintrendingribbonpage-div-57-1rvehy' className="mb-3 flex items-center gap-2">
            <Eye id='features-super-admin-presentation-superadmintrendingribbonpage-eye-58-l4s0tr' className="h-5 w-5 text-primary" />
            <h2 id='features-super-admin-presentation-superadmintrendingribbonpage-heading-59-yykuhp' className="font-semibold">المعاينة الحية</h2>
          </div>
          <div id='features-super-admin-presentation-superadmintrendingribbonpage-div-60-pm1gno' className="asol-section-tonal asol-section-tonal-primary mx-1 rounded-xl p-4">
            <TrendingRibbon id='features-super-admin-presentation-superadmintrendingribbonpage-trendingribbon-61-o0k6pf' config={previewConfig} />
          </div>
        </section>
      )}
    </main>
  );
}
