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
import type { UiDescriptor } from "@asol/ui-registry-core";
import { uiAttributes } from "@asol/ui-registry-core";

// ─── Types ───────────────────────────────────────────────────────────────────

interface FormItem {
  label: string;
  action: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

/** One descriptor per preset value; the identity is the interval itself. */
const INTERVAL_PRESETS = [5, 15, 30, 60] as const;

const INTERVAL_PRESET_UI: Record<(typeof INTERVAL_PRESETS)[number], UiDescriptor> = {
  5: { uid: "super-admin.trending-ribbon.interval-preset.5-tnQ0T9", id: "super-admin.trending-ribbon.interval-preset.5", kind: "action", action: "set-check-interval", part: "settings" },
  15: { uid: "super-admin.trending-ribbon.interval-preset.15-H0YIhI", id: "super-admin.trending-ribbon.interval-preset.15", kind: "action", action: "set-check-interval", part: "settings" },
  30: { uid: "super-admin.trending-ribbon.interval-preset.30-f2M1Tu", id: "super-admin.trending-ribbon.interval-preset.30", kind: "action", action: "set-check-interval", part: "settings" },
  60: { uid: "super-admin.trending-ribbon.interval-preset.60-1ALo7f", id: "super-admin.trending-ribbon.interval-preset.60", kind: "action", action: "set-check-interval", part: "settings" },
};

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
      <main {...uiAttributes({ uid: "super-admin.super-admin-trending-ribbon-page.main.3-X6Csnh", id: "super-admin.super-admin-trending-ribbon-page.main.3" })} id="super-admin.super-admin-trending-ribbon-page.main" className="container px-4 py-8 text-sm text-on-surface-variant">
        جاري التحقق وتحميل الإعدادات…
      </main>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <main {...uiAttributes({ uid: "super-admin.super-admin-trending-ribbon-page.main.4-d7PMk2", id: "super-admin.super-admin-trending-ribbon-page.main.4" })} id="super-admin.super-admin-trending-ribbon-page.main.2" className="container mx-auto max-w-4xl px-4 py-8">
      {/* ── Header ── */}
      <header {...uiAttributes({ uid: "super-admin.super-admin-trending-ribbon-page.header.2-Su6ri9", id: "super-admin.super-admin-trending-ribbon-page.header.2" })} id="super-admin.super-admin-trending-ribbon-page.header" className="mb-6 flex items-start gap-3">
        <div {...uiAttributes({ uid: "super-admin.super-admin-trending-ribbon-page.div.20-TD9wE4", id: "super-admin.super-admin-trending-ribbon-page.div.20" })} id="super-admin.super-admin-trending-ribbon-page.div" className="rounded-xl bg-primary/10 p-3 text-primary">
          <ShieldCheck id="super-admin.super-admin-trending-ribbon-page.shield-check" className="h-6 w-6" />
        </div>
        <div {...uiAttributes({ uid: "super-admin.super-admin-trending-ribbon-page.div.21-0I6XWo", id: "super-admin.super-admin-trending-ribbon-page.div.21" })} id="super-admin.super-admin-trending-ribbon-page.div.2">
          <p {...uiAttributes({ uid: "super-admin.super-admin-trending-ribbon-page.p.10-IcZMQ8", id: "super-admin.super-admin-trending-ribbon-page.p.10" })} id="super-admin.super-admin-trending-ribbon-page.p" className="text-sm font-medium text-primary">منطقة السوبر أدمن</p>
          <h1 {...uiAttributes({ uid: "super-admin.super-admin-trending-ribbon-page.h1.2-PTB2y8", id: "super-admin.super-admin-trending-ribbon-page.h1.2" })} id="super-admin.super-admin-trending-ribbon-page.h1" className="text-2xl font-bold">
            إدارة شريط النصوص المتحرك (TrendingRibbon)
          </h1>
          <p {...uiAttributes({ uid: "super-admin.super-admin-trending-ribbon-page.p.11-AC9lfV", id: "super-admin.super-admin-trending-ribbon-page.p.11" })} id="super-admin.super-admin-trending-ribbon-page.p.2" className="mt-1 text-sm text-muted-foreground">
            أضف أي عدد من النصوص والروابط التفاعلية للعرض في الصفحة الرئيسية.
          </p>
        </div>
      </header>

      {/* ── Meta ── */}
      <section {...uiAttributes({ uid: "super-admin.super-admin-trending-ribbon-page.section.7-VNDe10", id: "super-admin.super-admin-trending-ribbon-page.section.7" })} id="super-admin.super-admin-trending-ribbon-page.section" className="mb-4 grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2">
        <div {...uiAttributes({ uid: "super-admin.super-admin-trending-ribbon-page.div.22-7KfUcD", id: "super-admin.super-admin-trending-ribbon-page.div.22" })} id="super-admin.super-admin-trending-ribbon-page.div.3">
          <p {...uiAttributes({ uid: "super-admin.super-admin-trending-ribbon-page.p.12-Oo1K7a", id: "super-admin.super-admin-trending-ribbon-page.p.12" })} id="super-admin.super-admin-trending-ribbon-page.p.3" className="text-xs text-muted-foreground">الإصدار</p>
          <p {...uiAttributes({ uid: "super-admin.super-admin-trending-ribbon-page.p.13-R2QJ1I", id: "super-admin.super-admin-trending-ribbon-page.p.13" })} id="super-admin.super-admin-trending-ribbon-page.p.4" className="font-semibold">{record.version}</p>
        </div>
        <div {...uiAttributes({ uid: "super-admin.super-admin-trending-ribbon-page.div.23-9eDj14", id: "super-admin.super-admin-trending-ribbon-page.div.23" })} id="super-admin.super-admin-trending-ribbon-page.div.4">
          <p {...uiAttributes({ uid: "super-admin.super-admin-trending-ribbon-page.p.14-J0gFC9", id: "super-admin.super-admin-trending-ribbon-page.p.14" })} id="super-admin.super-admin-trending-ribbon-page.p.5" className="text-xs text-muted-foreground">آخر تحديث</p>
          <p {...uiAttributes({ uid: "super-admin.super-admin-trending-ribbon-page.p.15-D7S2E7", id: "super-admin.super-admin-trending-ribbon-page.p.15" })} id="super-admin.super-admin-trending-ribbon-page.p.6" className="text-sm">
            {formatDateTimeDefault(record.updatedAt)}
          </p>
        </div>
      </section>

      {/* ── Check Interval ── */}
      <section {...uiAttributes({ uid: "super-admin.super-admin-trending-ribbon-page.section.8-SEAF6W", id: "super-admin.super-admin-trending-ribbon-page.section.8" })} id="super-admin.super-admin-trending-ribbon-page.section.2" className="mb-6 rounded-xl border bg-card p-4">
        <div {...uiAttributes({ uid: "super-admin.super-admin-trending-ribbon-page.div.24-QVgT1U", id: "super-admin.super-admin-trending-ribbon-page.div.24" })} id="super-admin.super-admin-trending-ribbon-page.div.5" className="mb-3 flex items-center gap-2">
          <RefreshCw id="super-admin.super-admin-trending-ribbon-page.refresh-cw" className="h-5 w-5 text-primary" />
          <h2 {...uiAttributes({ uid: "super-admin.super-admin-trending-ribbon-page.h2.5-bW79l0", id: "super-admin.super-admin-trending-ribbon-page.h2.5" })} id="super-admin.super-admin-trending-ribbon-page.h2" className="font-semibold">فترة البحث عن تحديثات</h2>
        </div>
        <div {...uiAttributes({ uid: "super-admin.super-admin-trending-ribbon-page.div.25-3cJU5d", id: "super-admin.super-admin-trending-ribbon-page.div.25" })} id="super-admin.super-admin-trending-ribbon-page.div.6" className="flex flex-wrap items-end gap-3">
          <div {...uiAttributes({ uid: "super-admin.super-admin-trending-ribbon-page.div.26-G3SCQj", id: "super-admin.super-admin-trending-ribbon-page.div.26" })} id="super-admin.super-admin-trending-ribbon-page.div.7" className="min-w-52 space-y-2">
            <Label ui={{ uid: "super-admin.super-admin-trending-ribbon-page.label.5-3rVE4p", id: "super-admin.super-admin-trending-ribbon-page.label.5" }} id="super-admin.super-admin-trending-ribbon-page.label" htmlFor="super-admin.trending-ribbon.check-interval">الفترة بالدقائق</Label>
            <Input ui={{ uid: "super-admin.trending-ribbon.check-interval-P84Ols", id: "super-admin.trending-ribbon.check-interval", kind: "field", part: "settings" }}
              id="super-admin.trending-ribbon.check-interval"
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
              ui={INTERVAL_PRESET_UI[interval]}
              key={interval}
              type="button"
              size="sm"
              variant={intervalMinutes === interval ? "default" : "outline"}
              onClick={() => setIntervalMinutes(interval)}
            >
              {interval} دقيقة
            </Button>
          ))}
          <Button id="super-admin.super-admin-trending-ribbon-page.button" ui={{ uid: "super-admin.trending-ribbon.reload-settings-34fAPK", id: "super-admin.trending-ribbon.reload-settings", kind: "action", action: "reload", part: "settings" }}
            type="button"
            variant="outline"
            onClick={() => void load()}
            disabled={busy}
          >
            <RefreshCw id="super-admin.super-admin-trending-ribbon-page.refresh-cw.2" className="me-2 h-4 w-4" />
            فحص الآن
          </Button>
        </div>
      </section>

      {/* ── Message ── */}
      {message && (
        <div {...uiAttributes({ uid: "super-admin.super-admin-trending-ribbon-page.div.27-XaCZ21", id: "super-admin.super-admin-trending-ribbon-page.div.27" })} id="super-admin.super-admin-trending-ribbon-page.div.8"
          className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="status"
        >
          {message}
        </div>
      )}

      {/* ── Badge Settings ── */}
      <section {...uiAttributes({ uid: "super-admin.super-admin-trending-ribbon-page.section.9-1wDAZL", id: "super-admin.super-admin-trending-ribbon-page.section.9" })} id="super-admin.super-admin-trending-ribbon-page.section.3" className="mb-6 rounded-xl border bg-card p-4">
        <div {...uiAttributes({ uid: "super-admin.super-admin-trending-ribbon-page.div.28-7JLhuM", id: "super-admin.super-admin-trending-ribbon-page.div.28" })} id="super-admin.super-admin-trending-ribbon-page.div.9" className="mb-3 space-y-2">
          <Label ui={{ uid: "super-admin.super-admin-trending-ribbon-page.label.6-p4E1ay", id: "super-admin.super-admin-trending-ribbon-page.label.6" }} id="super-admin.super-admin-trending-ribbon-page.label.2" htmlFor="badge-label-input" className="font-semibold text-base block">
            شارة العنوان (Badge Label)
          </Label>
          <Input ui={{ uid: "super-admin.trending-ribbon.badge-label-BTA6QI", id: "super-admin.trending-ribbon.badge-label", kind: "field", part: "badge" }}
            id="badge-label-input"
            placeholder="مثال: home.trending.label أو الأكثر طلباً"
            value={badgeLabel}
            onChange={(e) => setBadgeLabel(e.target.value)}
          />
          <p {...uiAttributes({ uid: "super-admin.super-admin-trending-ribbon-page.p.16-B7BoOI", id: "super-admin.super-admin-trending-ribbon-page.p.16" })} id="super-admin.super-admin-trending-ribbon-page.p.7" className="text-xs text-muted-foreground">
            النص المعروض في المربع الملون قبل الشريط. يدعم مفاتيح الترجمة أو النصوص المباشرة.
          </p>
        </div>
      </section>

      {/* ── Add Item ── */}
      <section {...uiAttributes({ uid: "super-admin.super-admin-trending-ribbon-page.section.10-41Q2WI", id: "super-admin.super-admin-trending-ribbon-page.section.10" })} id="super-admin.super-admin-trending-ribbon-page.section.4" className="mb-6 rounded-xl border bg-card p-4">
        <div {...uiAttributes({ uid: "super-admin.super-admin-trending-ribbon-page.div.29-49JLwr", id: "super-admin.super-admin-trending-ribbon-page.div.29" })} id="super-admin.super-admin-trending-ribbon-page.div.10" className="mb-3 flex items-center gap-2">
          <Plus id="super-admin.super-admin-trending-ribbon-page.plus" className="h-5 w-5 text-primary" />
          <h2 {...uiAttributes({ uid: "super-admin.super-admin-trending-ribbon-page.h2.6-LW9kBU", id: "super-admin.super-admin-trending-ribbon-page.h2.6" })} id="super-admin.super-admin-trending-ribbon-page.h2.2" className="font-semibold">إضافة نص جديد للشريط</h2>
        </div>
        <div {...uiAttributes({ uid: "super-admin.super-admin-trending-ribbon-page.div.30-myHg4j", id: "super-admin.super-admin-trending-ribbon-page.div.30" })} id="super-admin.super-admin-trending-ribbon-page.div.11" className="grid gap-4 sm:grid-cols-2">
          <div {...uiAttributes({ uid: "super-admin.super-admin-trending-ribbon-page.div.31-3H9NPA", id: "super-admin.super-admin-trending-ribbon-page.div.31" })} id="super-admin.super-admin-trending-ribbon-page.div.12" className="space-y-1">
            <Label ui={{ uid: "super-admin.super-admin-trending-ribbon-page.label.7-D6BYRh", id: "super-admin.super-admin-trending-ribbon-page.label.7" }} id="super-admin.super-admin-trending-ribbon-page.label.3" htmlFor="new-item-label">النص المعروض</Label>
            <Input ui={{ uid: "super-admin.trending-ribbon.new-item-label-J00CtF", id: "super-admin.trending-ribbon.new-item-label", kind: "field", part: "new-item" }}
              id="new-item-label"
              placeholder="مثال: خصم 20% على العطور"
              value={newItemLabel}
              onChange={(e) => setNewItemLabel(e.target.value)}
            />
          </div>
          <div {...uiAttributes({ uid: "super-admin.super-admin-trending-ribbon-page.div.32-qb9Tiz", id: "super-admin.super-admin-trending-ribbon-page.div.32" })} id="super-admin.super-admin-trending-ribbon-page.div.13" className="space-y-1">
            <Label ui={{ uid: "super-admin.super-admin-trending-ribbon-page.label.8-U61Jj3", id: "super-admin.super-admin-trending-ribbon-page.label.8" }} id="super-admin.super-admin-trending-ribbon-page.label.4" htmlFor="new-item-action">الإجراء / الرابط</Label>
            <Input ui={{ uid: "super-admin.trending-ribbon.new-item-action-7aGP0n", id: "super-admin.trending-ribbon.new-item-action", kind: "field", part: "new-item" }}
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
        <div {...uiAttributes({ uid: "super-admin.super-admin-trending-ribbon-page.div.33-nD1Oft", id: "super-admin.super-admin-trending-ribbon-page.div.33" })} id="super-admin.super-admin-trending-ribbon-page.div.14" className="mt-3 flex justify-end">
          <Button id="super-admin.super-admin-trending-ribbon-page.button.2" ui={{ uid: "super-admin.trending-ribbon.add-item-8mOipK", id: "super-admin.trending-ribbon.add-item", kind: "action", action: "add-item", part: "new-item" }}
            type="button"
            onClick={addItem}
            disabled={!newItemLabel.trim() || !newItemAction.trim()}
          >
            <Plus id="super-admin.super-admin-trending-ribbon-page.plus.2" className="me-1 h-4 w-4" />
            إضافة إلى القائمة
          </Button>
        </div>
      </section>

      {/* ── Items List ── */}
      <section {...uiAttributes({ uid: "super-admin.super-admin-trending-ribbon-page.section.11-BgB8Ws", id: "super-admin.super-admin-trending-ribbon-page.section.11" })} id="super-admin.super-admin-trending-ribbon-page.section.5" className="mb-6 rounded-xl border bg-card p-4">
        <div {...uiAttributes({ uid: "super-admin.super-admin-trending-ribbon-page.div.34-UYYp8b", id: "super-admin.super-admin-trending-ribbon-page.div.34" })} id="super-admin.super-admin-trending-ribbon-page.div.15" className="mb-3 flex items-center justify-between">
          <h2 {...uiAttributes({ uid: "super-admin.super-admin-trending-ribbon-page.h2.7-wduU89", id: "super-admin.super-admin-trending-ribbon-page.h2.7" })} id="super-admin.super-admin-trending-ribbon-page.h2.3" className="font-semibold">النصوص المضافة ({items.length})</h2>
          <div {...uiAttributes({ uid: "super-admin.super-admin-trending-ribbon-page.div.35-sWekR3", id: "super-admin.super-admin-trending-ribbon-page.div.35" })} id="super-admin.super-admin-trending-ribbon-page.div.16" className="flex gap-2">
            <Button id="super-admin.super-admin-trending-ribbon-page.button.3" ui={{ uid: "super-admin.trending-ribbon.reload-items-iT9oDK", id: "super-admin.trending-ribbon.reload-items", kind: "action", action: "reload-items", part: "items" }}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void load()}
              disabled={busy}
            >
              <RefreshCw id="super-admin.super-admin-trending-ribbon-page.refresh-cw.3" className="me-1 h-3 w-3" />
              تحديث
            </Button>
          </div>
        </div>

        {items.length === 0 ? (
          <p {...uiAttributes({ uid: "super-admin.super-admin-trending-ribbon-page.p.17-3UN61K", id: "super-admin.super-admin-trending-ribbon-page.p.17" })} id="super-admin.super-admin-trending-ribbon-page.p.8" className="py-6 text-center text-sm text-muted-foreground">
            لا توجد نصوص مضافة حالياً. أضف عناصر جديدة أعلاه.
          </p>
        ) : (
          <div {...uiAttributes({ uid: "super-admin.super-admin-trending-ribbon-page.div.36-A6Wkxk", id: "super-admin.super-admin-trending-ribbon-page.div.36" })} id="super-admin.super-admin-trending-ribbon-page.div.17" className="space-y-2">
            {items.map((item, index) => (
              <div
                key={`${item.label}-${index}`} {...uiAttributes({ uid: "super-admin.super-admin-trending-ribbon-page.div.37-F98TFc", id: "super-admin.super-admin-trending-ribbon-page.div.37" })}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className="flex items-center gap-3 rounded-lg border bg-surface p-3 transition-colors"
              >
                <span {...uiAttributes({ uid: "super-admin.super-admin-trending-ribbon-page.span-F3NV5n", id: "super-admin.super-admin-trending-ribbon-page.span" })}
                  data-drag-handle
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  role="button"
                  aria-label="اسحب لإعادة الترتيب"
                  className="shrink-0 touch-none"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </span>
                <div {...uiAttributes({ uid: "super-admin.super-admin-trending-ribbon-page.div.38-pgN0AP", id: "super-admin.super-admin-trending-ribbon-page.div.38" })} className="min-w-0 flex-1">
                  <p {...uiAttributes({ uid: "super-admin.super-admin-trending-ribbon-page.p.18-PQpXl3", id: "super-admin.super-admin-trending-ribbon-page.p.18" })} className="truncate text-sm font-medium">{item.label}</p>
                  <p {...uiAttributes({ uid: "super-admin.super-admin-trending-ribbon-page.p.19-Tlj4I3", id: "super-admin.super-admin-trending-ribbon-page.p.19" })} className="truncate text-xs text-muted-foreground">
                    الإجراء: <code {...uiAttributes({ uid: "super-admin.super-admin-trending-ribbon-page.code-c14SE7", id: "super-admin.super-admin-trending-ribbon-page.code" })}>{item.action}</code>
                  </p>
                </div>
                <span {...uiAttributes({ uid: "super-admin.super-admin-trending-ribbon-page.span.2-Si21Ov", id: "super-admin.super-admin-trending-ribbon-page.span.2" })} className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  #{index + 1}
                </span>
                <Button ui={{ uid: "super-admin.super-admin-trending-ribbon-page.button.4-GAOP3U", id: "super-admin.super-admin-trending-ribbon-page.button.4" }}
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-destructive"
                  onClick={() => removeItem(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {items.length > 0 && (
          <p {...uiAttributes({ uid: "super-admin.super-admin-trending-ribbon-page.p.20-7833xL", id: "super-admin.super-admin-trending-ribbon-page.p.20" })} id="super-admin.super-admin-trending-ribbon-page.p.9" className="mt-3 text-xs text-muted-foreground">
            اسحب العناصر لإعادة الترتيب.
          </p>
        )}
      </section>

      {/* ── Live Preview ── */}
      {items.length > 0 && (
        <section {...uiAttributes({ uid: "super-admin.super-admin-trending-ribbon-page.section.12-Ucp84A", id: "super-admin.super-admin-trending-ribbon-page.section.12" })} id="super-admin.super-admin-trending-ribbon-page.section.6" className="rounded-xl border bg-card p-4">
          <div {...uiAttributes({ uid: "super-admin.super-admin-trending-ribbon-page.div.39-bT6shK", id: "super-admin.super-admin-trending-ribbon-page.div.39" })} id="super-admin.super-admin-trending-ribbon-page.div.18" className="mb-3 flex items-center gap-2">
            <Eye id="super-admin.super-admin-trending-ribbon-page.eye" className="h-5 w-5 text-primary" />
            <h2 {...uiAttributes({ uid: "super-admin.super-admin-trending-ribbon-page.h2.8-bi4NE7", id: "super-admin.super-admin-trending-ribbon-page.h2.8" })} id="super-admin.super-admin-trending-ribbon-page.h2.4" className="font-semibold">المعاينة الحية</h2>
          </div>
          <div {...uiAttributes({ uid: "super-admin.super-admin-trending-ribbon-page.div.40-0mURow", id: "super-admin.super-admin-trending-ribbon-page.div.40" })} id="super-admin.super-admin-trending-ribbon-page.div.19" className="asol-section-tonal asol-section-tonal-primary mx-1 rounded-xl p-4">
            <TrendingRibbon id="super-admin.super-admin-trending-ribbon-page.trending-ribbon" config={previewConfig} />
          </div>
        </section>
      )}
    </main>
  );
}
