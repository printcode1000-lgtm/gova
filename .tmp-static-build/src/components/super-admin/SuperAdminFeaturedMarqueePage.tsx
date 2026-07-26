"use client";

import {
  Eye,
  GripVertical,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { FeaturedMarquee } from "@/components/ui/FeaturedMarquee";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FEATURED_MARQUEE_CACHE_KEY,
  type FeaturedMarqueeRecord,
} from "@/features/advertisements/entities/featured-marquee.entity";
import { featuredMarqueeApiService } from "@/features/advertisements/services/featured-marquee-api-service";
import { useSession } from "@/features/auth/components/SessionProvider";
import { isSuperAdmin } from "@/features/auth/utils/super-admin";
import type { ProductRecord } from "@/features/product/entities/product.entity";
import { productApiService } from "@/features/product/services/product-api-service";
import { reportSystemIssue } from "@/features/system-logs/report-system-issue";
import { ASOL_DB_STORES, asolDbDelete } from "@/lib/asol-db";

interface ResolvedItem {
  productId: string;
  product: ProductRecord | null;
  isLoading: boolean;
  error: string | null;
}

function getProductName(product: ProductRecord): string {
  return product.mainData.name || "منتج بدون اسم";
}

function getProductPrice(product: ProductRecord): string {
  return product.price.current || product.price.label || "";
}

function getProductImage(product: ProductRecord): string {
  return product.images[0]?.url ?? "";
}

function buildProductAction(product: ProductRecord): string {
  return [
    "mode=view",
    `productId=${encodeURIComponent(product.id)}`,
    `mainCategoryId=${encodeURIComponent(product.mainCategoryId)}`,
    `subcategoryId=${encodeURIComponent(product.subcategoryId)}`,
  ].join("&");
}

export function SuperAdminFeaturedMarqueePage() {
  const router = useRouter();
  const { session, isLoading: sessionLoading } = useSession();
  const authorized = isSuperAdmin(session);

  const [record, setRecord] = useState<FeaturedMarqueeRecord | null>(null);
  const [items, setItems] = useState<ResolvedItem[]>([]);
  const [newProductId, setNewProductId] = useState("");
  const [intervalMinutes, setIntervalMinutes] = useState(15);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success",
  );
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
      setMessageType("error");
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
      setMessageType("error");
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

  const save = async () => {
    if (!session || !record) return;
    setBusy(true);
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
      setMessage("تم حفظ التعديلات وتطبيقها على الصفحة الرئيسية.");
      setMessageType("success");
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
      setMessage(arabicMessages[rawMessage] ?? rawMessage ?? "تعذر حفظ الإعدادات.");
      setMessageType("error");
    } finally {
      setBusy(false);
    }
  };

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
      <main className="container px-4 py-8 text-sm text-on-surface-variant">
        جاري التحقق وتحميل الإعدادات...
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6 flex items-start gap-3">
        <div className="rounded-xl bg-primary/10 p-3 text-primary">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-primary">
            منطقة السوبر أدمن
          </p>
          <h1 className="text-2xl font-bold">
            إدارة شريط المنتجات المميزة للصفحة الرئيسية
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            اختر المنتجات التي تظهر في الشريط المتحرك داخل صفحة Home.
          </p>
        </div>
      </header>

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

      <section className="mb-6 rounded-xl border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">فترة البحث عن التحديثات</h2>
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

      {message ? (
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
      ) : null}

      <section className="mb-6 rounded-xl border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Plus className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">إضافة منتج</h2>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 space-y-1">
            <Label htmlFor="new-product-id">معرف المنتج Product ID</Label>
            <Input
              id="new-product-id"
              placeholder="مثال: 3a1b2c-..."
              value={newProductId}
              onChange={(event) => setNewProductId(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void addProduct();
              }}
            />
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              onClick={() => void addProduct()}
              disabled={!newProductId.trim()}
            >
              <Plus className="me-1 h-4 w-4" />
              إضافة
            </Button>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          يمكنك نسخ معرف المنتج من صفحة المنتج، من قيمة <code>productId</code> في
          الرابط.
        </p>
      </section>

      <section className="mb-6 rounded-xl border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">
              المنتجات المختارة ({items.length})
            </h2>
          </div>
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
            لا توجد منتجات مختارة. أضف معرفات المنتجات من الأعلى.
          </p>
        ) : (
          <div className="space-y-2">
            {items.map((item, index) => (
              <div
                key={item.productId}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(event) => handleDragOver(event, index)}
                onDragEnd={handleDragEnd}
                className="flex items-center gap-3 rounded-lg border bg-surface p-2 transition-colors hover:border-primary/30"
              >
                <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground" />

                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-surface-bright">
                  {item.isLoading ? (
                    <div className="flex h-full w-full items-center justify-center">
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
                    <div className="flex h-full w-full items-center justify-center">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  {item.isLoading ? (
                    <p className="text-sm text-muted-foreground">
                      جاري التحميل...
                    </p>
                  ) : item.error ? (
                    <p className="text-sm text-destructive">{item.error}</p>
                  ) : item.product ? (
                    <>
                      <p className="truncate text-sm font-medium">
                        {getProductName(item.product)}
                      </p>
                      <p className="text-xs text-primary">
                        {getProductPrice(item.product) || "-"}
                      </p>
                    </>
                  ) : null}
                  <p className="truncate text-[10px] text-muted-foreground">
                    ID: {item.productId}
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
                  onClick={() => removeProduct(item.productId)}
                  aria-label="حذف المنتج من الشريط"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {items.length > 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">
            اسحب العناصر لإعادة الترتيب. المنتجات التي لم يتم العثور عليها لن
            تحفظ.
          </p>
        ) : null}
      </section>

      {validItems.length > 0 ? (
        <section className="rounded-xl border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">المعاينة الحية</h2>
          </div>
          <div className="asol-section-tonal asol-section-tonal-tertiary mx-1 rounded-xl p-4">
            <FeaturedMarquee config={previewConfig} />
          </div>
        </section>
      ) : null}
    </main>
  );
}
