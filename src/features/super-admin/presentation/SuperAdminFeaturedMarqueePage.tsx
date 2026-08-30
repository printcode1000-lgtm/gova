"use client";

import { formatDateTimeDefault } from "@asol/format-core";

import {
  Eye,
  GripVertical,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FeaturedMarquee } from "@/features/advertisements/ui";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  FEATURED_MARQUEE_CACHE_KEY,
  type FeaturedMarqueeRecord,
} from "@asol/featured-marquee-core";
import { featuredMarqueeApiService } from "@/features/advertisements";
import { useSession } from "@/features/auth/ui";
import { isSuperAdmin } from "@/features/auth";
import type { ProductRecord } from "@/features/product";
import { productApiService } from "@/features/product/ui";
import { reportSystemIssue } from '@asol/system-logs-core';
import { ASOL_DB_STORES, asolDbDelete } from "@asol/data-core/browser";
import { usePageSaveRegistration } from "@/features/page-save/ui";

import { ResolvedItem, getProductName, getProductPrice, getProductImage, buildProductAction } from "./featured-marquee/SuperAdminFeaturedMarqueePage.product-display";
import { createUiInstanceId, uiAttributes , createOpaqueUiInstanceId} from "@asol/ui-registry-core";

/** Stable authored preset values; one source UID is distinguished by runtime instance. */
const INTERVAL_PRESETS = [5, 15, 30, 60] as const;


export function SuperAdminFeaturedMarqueePage() {
  const router = useRouter();
  const { session, isLoading: sessionLoading } = useSession();
  const authorized = isSuperAdmin(session);

  const [record, setRecord] = useState<FeaturedMarqueeRecord | null>(null);
  const [items, setItems] = useState<ResolvedItem[]>([]);
  const [newProductId, setNewProductId] = useState("");
  const [intervalMinutes, setIntervalMinutes] = useState(15);
  const [busy, setBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const dragIndex = useRef<number | null>(null);

  useEffect(() => {
    if (!sessionLoading && !authorized) {
      router.replace(session ? "/home" : "/login");
    }
  }, [authorized, router, session, sessionLoading]);

  const resolveProduct = useCallback(
    async (productId: string): Promise<ResolvedItem> => {
      try {
        const product = await productApiService.get(productId, {
          suppressErrorLog: true,
        });
        return { productId, product, isLoading: false, error: null };
      } catch {
        return {
          productId,
          product: null,
          isLoading: false,
          error: "لم يتم العثور على هذا المنتج",
        };
      }
    },
    [],
  );

  const load = useCallback(async () => {
    if (!session || !isSuperAdmin(session)) return;
    setBusy(true);
    setMessage(null);
    try {
      const next = await featuredMarqueeApiService.getAdmin(session);
      setRecord(next);
      setIntervalMinutes(next.checkIntervalMinutes);
      setItems(
        next.config.productIds.map((productId) => ({
          productId,
          product: null,
          isLoading: true,
          error: null,
        })),
      );
      setItems(
        await Promise.all(
          next.config.productIds.map((productId) => resolveProduct(productId)),
        ),
      );
    } catch (error) {
      reportSystemIssue({
        feature: "FeaturedMarqueeAdmin",
        operation: "load-settings",
        error,
      });
      setMessage(
        error instanceof Error ? error.message : "تعذر تحميل الإعدادات.",
      );
    } finally {
      setBusy(false);
    }
  }, [resolveProduct, session]);

  useEffect(() => {
    if (!sessionLoading && authorized) void load();
  }, [authorized, load, sessionLoading]);

  const addProduct = async () => {
    const trimmed = newProductId.trim();
    if (!trimmed) return;
    if (items.some((item) => item.productId === trimmed)) {
      setMessage("هذا المنتج مضاف بالفعل.");
      return;
    }

    setNewProductId("");
    setMessage(null);
    setItems((current) => [
      ...current,
      { productId: trimmed, product: null, isLoading: true, error: null },
    ]);

    const resolved = await resolveProduct(trimmed);
    setItems((current) =>
      current.map((item) => (item.productId === trimmed ? resolved : item)),
    );
  };

  const removeProduct = (productId: string) => {
    setItems((current) =>
      current.filter((item) => item.productId !== productId),
    );
  };

  const handleDragStart = (index: number) => {
    dragIndex.current = index;
  };

  const handleDragOver = (event: React.DragEvent, overIndex: number) => {
    event.preventDefault();
    const from = dragIndex.current;
    if (from === null || from === overIndex) return;
    setItems((current) => {
      const next = [...current];
      const [moved] = next.splice(from, 1);
      if (!moved) return current;
      next.splice(overIndex, 0, moved);
      return next;
    });
    dragIndex.current = overIndex;
  };

  const handleDragEnd = () => {
    dragIndex.current = null;
  };

  const save = async (): Promise<boolean> => {
    if (!session || !record) return false;
    setSaveBusy(true);
    setMessage(null);
    try {
      const productIds = items
        .filter((item) => item.product !== null)
        .map((item) => item.productId);
      const saved = await featuredMarqueeApiService.save(
        session,
        { productIds },
        intervalMinutes,
      );

      try {
        await asolDbDelete(
          ASOL_DB_STORES.APP_SETTINGS,
          FEATURED_MARQUEE_CACHE_KEY,
        );
      } catch (cacheError) {
        console.error("Failed to delete local featured marquee cache:", cacheError);
      }

      setRecord(saved);
      return true;
    } catch (error) {
      reportSystemIssue({
        feature: "FeaturedMarqueeAdmin",
        operation: "save",
        error,
      });
      const rawMessage = error instanceof Error ? error.message : "";
      const arabicMessages: Record<string, string> = {
        forbidden: "غير مصرح لك بهذه العملية.",
        invalidFeaturedMarqueeConfig:
          "إعداد الشريط غير صالح، يرجى مراجعة البيانات.",
      };
      setMessage(arabicMessages[rawMessage] ?? rawMessage ?? "");
      return false;
    } finally {
      setSaveBusy(false);
    }
  };

  const savedFingerprint = record
    ? `${record.checkIntervalMinutes}:${record.config.productIds.join(",")}`
    : "";
  const currentFingerprint = `${intervalMinutes}:${items
    .filter((item) => item.product !== null)
    .map((item) => item.productId)
    .join(",")}`;
  const isMarqueeDirty =
    Boolean(record) && currentFingerprint !== savedFingerprint;

  usePageSaveRegistration({
    id: "super-admin-featured-marquee",
    label: "شريط المنتجات المميزة",
    returnPath: "/super-admin/featured-marquee",
    enabled: authorized && Boolean(record),
    items: [
      {
        id: "featured-marquee",
        label: "منتجات الشريط",
        isDirty: isMarqueeDirty,
        canSave:
          isMarqueeDirty && !saveBusy && items.some((item) => item.product),
      },
    ],
    isSaving: saveBusy,
    canSave: isMarqueeDirty && !saveBusy && items.some((item) => item.product),
    save: async (selectedItemIds) => {
      if (!selectedItemIds.includes("featured-marquee")) return true;
      return save();
    },
  });

  const validItems = items.filter((item) => item.product !== null);
  const previewConfig = useMemo(
    () => ({
      sectionTitle: "المنتجات المميزة",
      items: validItems.map((item) => ({
        id: item.productId,
        title: getProductName(item.product!),
        price: getProductPrice(item.product!),
        image: getProductImage(item.product!),
        action: buildProductAction(item.product!),
      })),
    }),
    [validItems],
  );

  if (sessionLoading || !authorized || !record) {
    return (
      <main {...uiAttributes({ uid: "super-admin.super-admin-featured-marquee-page.main.3-S4Ylnl", id: "super-admin.super-admin-featured-marquee-page.main.3" })} id="super-admin.super-admin-featured-marquee-page.main" className="container px-4 py-8 text-sm text-on-surface-variant">
        جاري التحقق وتحميل الإعدادات...
      </main>
    );
  }

  return (
    <main {...uiAttributes({ uid: "super-admin.super-admin-featured-marquee-page.main.4-14U70Z", id: "super-admin.super-admin-featured-marquee-page.main.4" })} id="super-admin.super-admin-featured-marquee-page.main.2" className="container mx-auto max-w-4xl px-4 py-8">
      <header {...uiAttributes({ uid: "super-admin.super-admin-featured-marquee-page.header.2-K1meV1", id: "super-admin.super-admin-featured-marquee-page.header.2" })} id="super-admin.super-admin-featured-marquee-page.header" className="mb-6 flex items-start gap-3">
        <div {...uiAttributes({ uid: "super-admin.super-admin-featured-marquee-page.div.19-Xx4OxE", id: "super-admin.super-admin-featured-marquee-page.div.19" })} id="super-admin.super-admin-featured-marquee-page.div" className="rounded-xl bg-primary/10 p-3 text-primary">
          <ShieldCheck id="super-admin.super-admin-featured-marquee-page.shield-check" className="h-6 w-6" />
        </div>
        <div {...uiAttributes({ uid: "super-admin.super-admin-featured-marquee-page.div.20-2PDnzj", id: "super-admin.super-admin-featured-marquee-page.div.20" })} id="super-admin.super-admin-featured-marquee-page.div.2">
          <p {...uiAttributes({ uid: "super-admin.super-admin-featured-marquee-page.p.10-F14AoL", id: "super-admin.super-admin-featured-marquee-page.p.10" })} id="super-admin.super-admin-featured-marquee-page.p" className="text-sm font-medium text-primary">
            منطقة السوبر أدمن
          </p>
          <h1 {...uiAttributes({ uid: "super-admin.super-admin-featured-marquee-page.h1.2-2WjPCg", id: "super-admin.super-admin-featured-marquee-page.h1.2" })} id="super-admin.super-admin-featured-marquee-page.h1" className="text-2xl font-bold">
            إدارة شريط المنتجات المميزة للصفحة الرئيسية
          </h1>
          <p {...uiAttributes({ uid: "super-admin.super-admin-featured-marquee-page.p.11-FS03Tp", id: "super-admin.super-admin-featured-marquee-page.p.11" })} id="super-admin.super-admin-featured-marquee-page.p.2" className="mt-1 text-sm text-muted-foreground">
            اختر المنتجات التي تظهر في الشريط المتحرك داخل صفحة Home.
          </p>
        </div>
      </header>

      <section {...uiAttributes({ uid: "super-admin.super-admin-featured-marquee-page.section.6-H7FW15", id: "super-admin.super-admin-featured-marquee-page.section.6" })} id="super-admin.super-admin-featured-marquee-page.section" className="mb-4 grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2">
        <div {...uiAttributes({ uid: "super-admin.super-admin-featured-marquee-page.div.21-Y39FKn", id: "super-admin.super-admin-featured-marquee-page.div.21" })} id="super-admin.super-admin-featured-marquee-page.div.3">
          <p {...uiAttributes({ uid: "super-admin.super-admin-featured-marquee-page.p.12-WEB1wD", id: "super-admin.super-admin-featured-marquee-page.p.12" })} id="super-admin.super-admin-featured-marquee-page.p.3" className="text-xs text-muted-foreground">الإصدار</p>
          <p {...uiAttributes({ uid: "super-admin.super-admin-featured-marquee-page.p.13-VA7mKK", id: "super-admin.super-admin-featured-marquee-page.p.13" })} id="super-admin.super-admin-featured-marquee-page.p.4" className="font-semibold">{record.version}</p>
        </div>
        <div {...uiAttributes({ uid: "super-admin.super-admin-featured-marquee-page.div.22-XPPZ9h", id: "super-admin.super-admin-featured-marquee-page.div.22" })} id="super-admin.super-admin-featured-marquee-page.div.4">
          <p {...uiAttributes({ uid: "super-admin.super-admin-featured-marquee-page.p.14-c1O5Yy", id: "super-admin.super-admin-featured-marquee-page.p.14" })} id="super-admin.super-admin-featured-marquee-page.p.5" className="text-xs text-muted-foreground">آخر تحديث</p>
          <p {...uiAttributes({ uid: "super-admin.super-admin-featured-marquee-page.p.15-i2SNOQ", id: "super-admin.super-admin-featured-marquee-page.p.15" })} id="super-admin.super-admin-featured-marquee-page.p.6" className="text-sm">
            {formatDateTimeDefault(record.updatedAt)}
          </p>
        </div>
      </section>

      <section {...uiAttributes({ uid: "super-admin.super-admin-featured-marquee-page.section.7-UwRA3M", id: "super-admin.super-admin-featured-marquee-page.section.7" })} id="super-admin.super-admin-featured-marquee-page.section.2" className="mb-6 rounded-xl border bg-card p-4">
        <div {...uiAttributes({ uid: "super-admin.super-admin-featured-marquee-page.div.23-HdGZ19", id: "super-admin.super-admin-featured-marquee-page.div.23" })} id="super-admin.super-admin-featured-marquee-page.div.5" className="mb-3 flex items-center gap-2">
          <RefreshCw id="super-admin.super-admin-featured-marquee-page.refresh-cw" className="h-5 w-5 text-primary" />
          <h2 {...uiAttributes({ uid: "super-admin.super-admin-featured-marquee-page.h2.5-3J8o0Q", id: "super-admin.super-admin-featured-marquee-page.h2.5" })} id="super-admin.super-admin-featured-marquee-page.h2" className="font-semibold">فترة البحث عن التحديثات</h2>
        </div>
        <div {...uiAttributes({ uid: "super-admin.super-admin-featured-marquee-page.div.24-M9sxLA", id: "super-admin.super-admin-featured-marquee-page.div.24" })} id="super-admin.super-admin-featured-marquee-page.div.6" className="flex flex-wrap items-end gap-3">
          <div {...uiAttributes({ uid: "super-admin.super-admin-featured-marquee-page.div.25-NM89JT", id: "super-admin.super-admin-featured-marquee-page.div.25" })} id="super-admin.super-admin-featured-marquee-page.div.7" className="min-w-52 space-y-2">
            <Label ui={{ uid: "super-admin.super-admin-featured-marquee-page.label.3-DUE6nT", id: "super-admin.super-admin-featured-marquee-page.label.3" }} id="super-admin.super-admin-featured-marquee-page.label" htmlFor="super-admin.featured-marquee.check-interval">الفترة بالدقائق</Label>
            <Input ui={{ uid: "super-admin.featured-marquee.check-interval-K57juN", id: "super-admin.featured-marquee.check-interval", kind: "field", part: "settings" }}
              id="super-admin.featured-marquee.check-interval"
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
              key={interval} ui={{ uid: "super-admin.super-admin-featured-marquee-page.button.5-bYj3oC", id: "super-admin.super-admin-featured-marquee-page.button.5", kind: "action", action: "set-check-interval", part: "settings", instance: createUiInstanceId(String(interval)) }}
              type="button"
              size="sm"
              variant={intervalMinutes === interval ? "default" : "outline"}
              onClick={() => setIntervalMinutes(interval)}
            >
              {interval} دقيقة
            </Button>
          ))}
          <Button id="super-admin.super-admin-featured-marquee-page.button" ui={{ uid: "super-admin.featured-marquee.reload-settings-QvFS5N", id: "super-admin.featured-marquee.reload-settings", kind: "action", action: "reload", part: "settings" }}
            type="button"
            variant="outline"
            onClick={() => void load()}
            disabled={busy}
          >
            <RefreshCw id="super-admin.super-admin-featured-marquee-page.refresh-cw.2" className="me-2 h-4 w-4" />
            فحص الآن
          </Button>
        </div>
      </section>

      {message ? (
        <div {...uiAttributes({ uid: "super-admin.super-admin-featured-marquee-page.div.26-7JY3oA", id: "super-admin.super-admin-featured-marquee-page.div.26" })} id="super-admin.super-admin-featured-marquee-page.div.8"
          className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="status"
        >
          {message}
        </div>
      ) : null}

      <section {...uiAttributes({ uid: "super-admin.super-admin-featured-marquee-page.section.8-IuN3jL", id: "super-admin.super-admin-featured-marquee-page.section.8" })} id="super-admin.super-admin-featured-marquee-page.section.3" className="mb-6 rounded-xl border bg-card p-4">
        <div {...uiAttributes({ uid: "super-admin.super-admin-featured-marquee-page.div.27-RQ3j70", id: "super-admin.super-admin-featured-marquee-page.div.27" })} id="super-admin.super-admin-featured-marquee-page.div.9" className="mb-3 flex items-center gap-2">
          <Plus id="super-admin.super-admin-featured-marquee-page.plus" className="h-5 w-5 text-primary" />
          <h2 {...uiAttributes({ uid: "super-admin.super-admin-featured-marquee-page.h2.6-0IuA8X", id: "super-admin.super-admin-featured-marquee-page.h2.6" })} id="super-admin.super-admin-featured-marquee-page.h2.2" className="font-semibold">إضافة منتج</h2>
        </div>
        <div {...uiAttributes({ uid: "super-admin.super-admin-featured-marquee-page.div.28-7Q4bsM", id: "super-admin.super-admin-featured-marquee-page.div.28" })} id="super-admin.super-admin-featured-marquee-page.div.10" className="flex gap-2">
          <div {...uiAttributes({ uid: "super-admin.super-admin-featured-marquee-page.div.29-Pcex7w", id: "super-admin.super-admin-featured-marquee-page.div.29" })} id="super-admin.super-admin-featured-marquee-page.div.11" className="flex-1 space-y-1">
            <Label ui={{ uid: "super-admin.super-admin-featured-marquee-page.label.4-fFns6k", id: "super-admin.super-admin-featured-marquee-page.label.4" }} id="super-admin.super-admin-featured-marquee-page.label.2" htmlFor="new-product-id">معرف المنتج Product ID</Label>
            <Input ui={{ uid: "super-admin.featured-marquee.new-product-id-bGl51Q", id: "super-admin.featured-marquee.new-product-id", kind: "field", part: "new-item" }}
              id="new-product-id"
              placeholder="مثال: 3a1b2c-..."
              value={newProductId}
              onChange={(event) => setNewProductId(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void addProduct();
              }}
            />
          </div>
          <div {...uiAttributes({ uid: "super-admin.super-admin-featured-marquee-page.div.30-G5I0Nf", id: "super-admin.super-admin-featured-marquee-page.div.30" })} id="super-admin.super-admin-featured-marquee-page.div.12" className="flex items-end">
            <Button id="super-admin.super-admin-featured-marquee-page.button.2" ui={{ uid: "super-admin.featured-marquee.add-product-mh41B1", id: "super-admin.featured-marquee.add-product", kind: "action", action: "add-product", part: "new-item" }}
              type="button"
              onClick={() => void addProduct()}
              disabled={!newProductId.trim()}
            >
              <Plus id="super-admin.super-admin-featured-marquee-page.plus.2" className="me-1 h-4 w-4" />
              إضافة
            </Button>
          </div>
        </div>
        <p {...uiAttributes({ uid: "super-admin.super-admin-featured-marquee-page.p.16-gv0LMe", id: "super-admin.super-admin-featured-marquee-page.p.16" })} id="super-admin.super-admin-featured-marquee-page.p.7" className="mt-2 text-xs text-muted-foreground">
          يمكنك نسخ معرف المنتج من صفحة المنتج، من قيمة <code {...uiAttributes({ uid: "super-admin.super-admin-featured-marquee-page.code-qXd1vD", id: "super-admin.super-admin-featured-marquee-page.code" })}>productId</code> في
          الرابط.
        </p>
      </section>

      <section {...uiAttributes({ uid: "super-admin.super-admin-featured-marquee-page.section.9-Z9d5fs", id: "super-admin.super-admin-featured-marquee-page.section.9" })} id="super-admin.super-admin-featured-marquee-page.section.4" className="mb-6 rounded-xl border bg-card p-4">
        <div {...uiAttributes({ uid: "super-admin.super-admin-featured-marquee-page.div.31-nu6MSb", id: "super-admin.super-admin-featured-marquee-page.div.31" })} id="super-admin.super-admin-featured-marquee-page.div.13" className="mb-3 flex items-center justify-between">
          <div {...uiAttributes({ uid: "super-admin.super-admin-featured-marquee-page.div.32-Dk1ARN", id: "super-admin.super-admin-featured-marquee-page.div.32" })} id="super-admin.super-admin-featured-marquee-page.div.14" className="flex items-center gap-2">
            <Package id="super-admin.super-admin-featured-marquee-page.package" className="h-5 w-5 text-primary" />
            <h2 {...uiAttributes({ uid: "super-admin.super-admin-featured-marquee-page.h2.7-zivRp2", id: "super-admin.super-admin-featured-marquee-page.h2.7" })} id="super-admin.super-admin-featured-marquee-page.h2.3" className="font-semibold">
              المنتجات المختارة ({items.length})
            </h2>
          </div>
          <div {...uiAttributes({ uid: "super-admin.super-admin-featured-marquee-page.div.33-4Y29Hp", id: "super-admin.super-admin-featured-marquee-page.div.33" })} id="super-admin.super-admin-featured-marquee-page.div.15" className="flex gap-2">
            <Button id="super-admin.super-admin-featured-marquee-page.button.3" ui={{ uid: "super-admin.featured-marquee.reload-items-Y8binQ", id: "super-admin.featured-marquee.reload-items", kind: "action", action: "reload-items", part: "items" }}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void load()}
              disabled={busy}
            >
              <RefreshCw id="super-admin.super-admin-featured-marquee-page.refresh-cw.3" className="me-1 h-3 w-3" />
              تحديث
            </Button>
          </div>
        </div>

        {items.length === 0 ? (
          <p {...uiAttributes({ uid: "super-admin.super-admin-featured-marquee-page.p.17-7HcSBl", id: "super-admin.super-admin-featured-marquee-page.p.17" })} id="super-admin.super-admin-featured-marquee-page.p.8" className="py-6 text-center text-sm text-muted-foreground">
            لا توجد منتجات مختارة. أضف معرفات المنتجات من الأعلى.
          </p>
        ) : (
          <div {...uiAttributes({ uid: "super-admin.super-admin-featured-marquee-page.div.34-9a2OQx", id: "super-admin.super-admin-featured-marquee-page.div.34" })} id="super-admin.super-admin-featured-marquee-page.div.16" className="space-y-2">
            {items.map((item, index) => (
              <div
                key={item.productId} {...uiAttributes({ uid: "super-admin.super-admin-featured-marquee-page.div.35-O91tXN", id: "super-admin.super-admin-featured-marquee-page.div.35" , instance: createOpaqueUiInstanceId("iter-47187e69b8", String(item.productId))})}
                onDragOver={(event) => handleDragOver(event, index)}
                onDragEnd={handleDragEnd}
                className="flex items-center gap-3 rounded-lg border bg-surface p-2 transition-colors"
              >
                <span {...uiAttributes({ uid: "super-admin.super-admin-featured-marquee-page.span-Y7lcEi", id: "super-admin.super-admin-featured-marquee-page.span" , instance: createOpaqueUiInstanceId("iter-02036c1f65", String(item.productId))})}
                  data-drag-handle
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  role="button"
                  aria-label="اسحب لإعادة ترتيب المنتج"
                  className="shrink-0 touch-none"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </span>

                <div {...uiAttributes({ uid: "super-admin.super-admin-featured-marquee-page.div.36-7TVl4s", id: "super-admin.super-admin-featured-marquee-page.div.36" , instance: createOpaqueUiInstanceId("iter-8a07018ebd", String(item.productId))})} className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-surface-bright">
                  {item.isLoading ? (
                    <div {...uiAttributes({ uid: "super-admin.super-admin-featured-marquee-page.div.37-FiN5Bz", id: "super-admin.super-admin-featured-marquee-page.div.37" , instance: createOpaqueUiInstanceId("iter-9e3c74ab5e", String(item.productId))})} className="flex h-full w-full items-center justify-center">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : item.product && getProductImage(item.product) ? (
                    <Image
                      src={getProductImage(item.product)}
                      alt={getProductName(item.product)}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div {...uiAttributes({ uid: "super-admin.super-admin-featured-marquee-page.div.38-UF78wM", id: "super-admin.super-admin-featured-marquee-page.div.38" , instance: createOpaqueUiInstanceId("iter-92fb240a4c", String(item.productId))})} className="flex h-full w-full items-center justify-center">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                </div>

                <div {...uiAttributes({ uid: "super-admin.super-admin-featured-marquee-page.div.39-kQ4WlN", id: "super-admin.super-admin-featured-marquee-page.div.39" , instance: createOpaqueUiInstanceId("iter-834a1b6512", String(item.productId))})} className="min-w-0 flex-1">
                  {item.isLoading ? (
                    <p {...uiAttributes({ uid: "super-admin.super-admin-featured-marquee-page.p.18-iiLm7g", id: "super-admin.super-admin-featured-marquee-page.p.18" , instance: createOpaqueUiInstanceId("iter-bc9746759c", String(item.productId))})} className="text-sm text-muted-foreground">
                      جاري التحميل...
                    </p>
                  ) : item.error ? (
                    <p {...uiAttributes({ uid: "super-admin.super-admin-featured-marquee-page.p.19-hSUlH5", id: "super-admin.super-admin-featured-marquee-page.p.19" , instance: createOpaqueUiInstanceId("iter-fe8cfec14a", String(item.productId))})} className="text-sm text-destructive">{item.error}</p>
                  ) : item.product ? (
                    <>
                      <p {...uiAttributes({ uid: "super-admin.super-admin-featured-marquee-page.p.20-Dwy0Xe", id: "super-admin.super-admin-featured-marquee-page.p.20" , instance: createOpaqueUiInstanceId("iter-887b355258", String(item.productId))})} className="truncate text-sm font-medium">
                        {getProductName(item.product)}
                      </p>
                      <p {...uiAttributes({ uid: "super-admin.super-admin-featured-marquee-page.p.21-eR2jw7", id: "super-admin.super-admin-featured-marquee-page.p.21" , instance: createOpaqueUiInstanceId("iter-e545cc138a", String(item.productId))})} className="text-xs text-primary">
                        {getProductPrice(item.product) || "-"}
                      </p>
                    </>
                  ) : null}
                  <p {...uiAttributes({ uid: "super-admin.super-admin-featured-marquee-page.p.22-64nVFv", id: "super-admin.super-admin-featured-marquee-page.p.22" , instance: createOpaqueUiInstanceId("iter-cf6b798fc1", String(item.productId))})} className="truncate text-[10px] text-muted-foreground">
                    ID: {item.productId}
                  </p>
                </div>

                <span {...uiAttributes({ uid: "super-admin.super-admin-featured-marquee-page.span.2-gS83ZR", id: "super-admin.super-admin-featured-marquee-page.span.2" , instance: createOpaqueUiInstanceId("iter-ba1820f6bc", String(item.productId))})} className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  #{index + 1}
                </span>

                <Button ui={{ uid: "super-admin.super-admin-featured-marquee-page.button.4-0AWpSh", id: "super-admin.super-admin-featured-marquee-page.button.4" , instance: createOpaqueUiInstanceId("iter-70fc0a5fbb", String(item.productId))}}
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-destructive"
                  onClick={() => removeProduct(item.productId)}
                  aria-label="إزالة المنتج من الشريط"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {items.length > 0 ? (
          <p {...uiAttributes({ uid: "super-admin.super-admin-featured-marquee-page.p.23-3Kg40L", id: "super-admin.super-admin-featured-marquee-page.p.23" })} id="super-admin.super-admin-featured-marquee-page.p.9" className="mt-3 text-xs text-muted-foreground">
            اسحب العناصر لإعادة الترتيب. المنتجات التي لم يتم العثور عليها لن
            تحفظ.
          </p>
        ) : null}
      </section>

      {validItems.length > 0 ? (
        <section {...uiAttributes({ uid: "super-admin.super-admin-featured-marquee-page.section.10-5JIiLZ", id: "super-admin.super-admin-featured-marquee-page.section.10" })} id="super-admin.super-admin-featured-marquee-page.section.5" className="rounded-xl border bg-card p-4">
          <div {...uiAttributes({ uid: "super-admin.super-admin-featured-marquee-page.div.40-PZw2BR", id: "super-admin.super-admin-featured-marquee-page.div.40" })} id="super-admin.super-admin-featured-marquee-page.div.17" className="mb-3 flex items-center gap-2">
            <Eye id="super-admin.super-admin-featured-marquee-page.eye" className="h-5 w-5 text-primary" />
            <h2 {...uiAttributes({ uid: "super-admin.super-admin-featured-marquee-page.h2.8-jG6wGn", id: "super-admin.super-admin-featured-marquee-page.h2.8" })} id="super-admin.super-admin-featured-marquee-page.h2.4" className="font-semibold">المعاينة الحية</h2>
          </div>
          <div {...uiAttributes({ uid: "super-admin.super-admin-featured-marquee-page.div.41-h0WhZO", id: "super-admin.super-admin-featured-marquee-page.div.41" })} id="super-admin.super-admin-featured-marquee-page.div.18" className="asol-section-tonal asol-section-tonal-tertiary mx-1 rounded-xl p-4">
            <FeaturedMarquee id="super-admin.super-admin-featured-marquee-page.featured-marquee" config={previewConfig} />
          </div>
        </section>
      ) : null}
    </main>
  );
}
