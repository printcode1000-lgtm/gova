"use client";

import * as React from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Box,
  ClipboardList,
  FileJson,
  Layers,
  RefreshCw,
  ShieldAlert,
  ShoppingBag,
  Star,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { asolApi } from "@/core/api";
import { useSession } from "@/features/auth/components/SessionProvider";
import { isSuperAdmin } from "@/features/auth/utils/super-admin";

import { GOOGLE_PLAY_CONSOLE_API } from "../config";
import type {
  GooglePlayConsoleEndpointResult,
  GooglePlayConsoleSnapshot,
} from "../domain/types";

function dateText(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("ar-EG", {
        dateStyle: "medium",
        timeStyle: "short",
      });
}

function getArray(data: unknown, key: string): unknown[] {
  if (!data || typeof data !== "object") return [];
  const value = (data as Record<string, unknown>)[key];
  return Array.isArray(value) ? value : [];
}

function endpointByKey(
  snapshot: GooglePlayConsoleSnapshot | null,
  key: string,
) {
  return snapshot?.endpoints.find((endpoint) => endpoint.key === key) ?? null;
}

function collectTrackReleases(data: unknown) {
  return getArray(data, "tracks").flatMap((track) => {
    const trackItem = track as { track?: string; releases?: unknown[] };
    return (trackItem.releases ?? []).map((release) => {
      const releaseItem = release as {
        name?: string;
        status?: string;
        versionCodes?: string[];
        userFraction?: number;
      };
      return {
        track: trackItem.track ?? "-",
        name: releaseItem.name || "إصدار بدون اسم",
        status: releaseItem.status ?? "unknown",
        versionCodes: releaseItem.versionCodes ?? [],
        userFraction: releaseItem.userFraction,
        versioned: Boolean(releaseItem.versionCodes?.length),
      };
    });
  });
}

function collectProductionVersionCodes(data: unknown) {
  return new Set(
    collectTrackReleases(data)
      .filter((release) => release.track === "production")
      .flatMap((release) => release.versionCodes.map(String)),
  );
}

function releaseStatusText(status: string) {
  const labels: Record<string, string> = {
    completed: "منشور ومكتمل",
    draft: "مسودة لم ترسل للمراجعة",
    inProgress: "طرح تدريجي جار",
    halted: "طرح متوقف",
    unknown: "غير محدد",
  };
  return labels[status] ?? status;
}

export function GooglePlayConsolePage() {
  const { session, isLoading } = useSession();
  const allowedUser = !isLoading && isSuperAdmin(session);
  const [snapshot, setSnapshot] =
    React.useState<GooglePlayConsoleSnapshot | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  const authHeaders = React.useMemo(
    () =>
      session?.sessionToken
        ? { "x-asol-session-token": session.sessionToken }
        : undefined,
    [session?.sessionToken],
  );

  const load = React.useCallback(async () => {
    if (!authHeaders || !allowedUser) return;
    setBusy(true);
    setError("");
    try {
      setSnapshot(
        await asolApi.get<GooglePlayConsoleSnapshot>(
          GOOGLE_PLAY_CONSOLE_API.snapshot,
          { headers: authHeaders, cache: "no-store" },
        ),
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "تعذر تحميل بيانات Google Play Console",
      );
    } finally {
      setBusy(false);
    }
  }, [allowedUser, authHeaders]);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (isLoading) {
    return <main className="p-4 text-sm text-on-surface-variant">جاري التحميل...</main>;
  }

  if (!allowedUser) {
    return (
      <main className="mx-auto max-w-2xl p-6" dir="rtl">
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
          هذه الصفحة متاحة للسوبر أدمن فقط.
        </div>
      </main>
    );
  }

  const tracks = endpointByKey(snapshot, "tracks");
  const listings = endpointByKey(snapshot, "listings");
  const reviews = endpointByKey(snapshot, "reviews");
  const products = endpointByKey(snapshot, "inAppProducts");
  const subscriptions = endpointByKey(snapshot, "subscriptions");
  const devAllowed = snapshot?.environment.allowed ?? true;

  return (
    <main className="mx-auto w-full max-w-7xl space-y-4 p-4 pb-24" dir="rtl">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-on-surface">
            <ShoppingBag className="h-6 w-6 text-primary" />
            Google Play Console
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            عرض قراءة فقط لكل ما تسمح به صلاحيات حساب الخدمة في بيئة التطوير.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => void load()} disabled={busy}>
          <RefreshCw className="h-4 w-4" />
          {busy ? "جاري التحديث" : "تحديث البيانات"}
        </Button>
      </header>

      {!devAllowed ? (
        <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-800">
          <div className="flex items-center gap-2 font-semibold">
            <ShieldAlert className="h-5 w-5" />
            الصفحة تعمل في بيئة التطوير فقط
          </div>
          <p className="mt-1 text-sm">
            لا يتم جلب أي بيانات من Google Play خارج التطوير.
          </p>
        </section>
      ) : null}

      {error ? (
        <section className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </section>
      ) : null}

      {snapshot ? (
        <>
          <section className="grid gap-3 md:grid-cols-4">
            <SummaryCard label="نقاط ناجحة" value={snapshot.summary.successfulEndpoints} />
            <SummaryCard label="نقاط مرفوضة" value={snapshot.summary.failedEndpoints} />
            <SummaryCard label="مسارات النشر" value={snapshot.summary.tracks} />
            <SummaryCard label="الإصدارات" value={snapshot.summary.releases} />
          </section>

          <PublishingStatusPanel endpoint={tracks} />

          <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-md border bg-surface p-4">
              <div className="mb-3 flex items-center gap-2 font-semibold">
                <BadgeCheck className="h-5 w-5 text-primary" />
                إعدادات الربط الآمنة
              </div>
              <div className="grid gap-2 text-sm">
                <Detail label="اسم الحزمة" value={snapshot.config.packageName} ltr />
                <Detail label="حساب الخدمة" value={snapshot.config.serviceAccountEmail || "-"} ltr />
                <Detail label="Project ID" value={snapshot.config.serviceAccountProjectId || "-"} ltr />
                <Detail label="Unique ID" value={snapshot.config.serviceAccountUniqueId || "-"} ltr />
                <Detail label="مصدر الاعتماد" value={snapshot.config.credentialSource} ltr />
                <Detail label="ملف المفتاح" value={snapshot.config.keyFilePath} ltr />
                <Detail label="آخر قراءة" value={dateText(snapshot.fetchedAt)} />
              </div>
            </div>
            <EndpointCard endpoint={endpointByKey(snapshot, "details")} icon={<ClipboardList className="h-5 w-5" />} />
            <EndpointCard endpoint={endpointByKey(snapshot, "edit")} icon={<ShieldAlert className="h-5 w-5" />} />
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <EndpointCard endpoint={tracks} icon={<Layers className="h-5 w-5" />}>
              <TrackList data={tracks?.data} />
            </EndpointCard>
            <EndpointCard endpoint={listings} icon={<FileJson className="h-5 w-5" />}>
              <ListingList data={listings?.data} />
            </EndpointCard>
            <EndpointCard endpoint={reviews} icon={<Star className="h-5 w-5" />}>
              <SimpleCount data={reviews?.data} itemKey="reviews" emptyText="لا توجد مراجعات متاحة للعرض." />
            </EndpointCard>
            <EndpointCard endpoint={products} icon={<Box className="h-5 w-5" />}>
              <SimpleCount data={products?.data} itemKey="inappproduct" emptyText="لا توجد منتجات شراء داخل التطبيق." />
            </EndpointCard>
            <EndpointCard endpoint={subscriptions} icon={<Box className="h-5 w-5" />}>
              <SimpleCount data={subscriptions?.data} itemKey="subscriptions" emptyText="لا توجد اشتراكات متاحة." />
            </EndpointCard>
            <EndpointCard endpoint={endpointByKey(snapshot, "apks")} icon={<Box className="h-5 w-5" />} />
            <EndpointCard endpoint={endpointByKey(snapshot, "bundles")} icon={<Box className="h-5 w-5" />}>
              <BundleList
                data={endpointByKey(snapshot, "bundles")?.data}
                productionVersionCodes={collectProductionVersionCodes(tracks?.data)}
              />
            </EndpointCard>
          </section>

          <section className="rounded-md border bg-surface p-4">
            <div className="mb-3 flex items-center gap-2 font-semibold">
              <FileJson className="h-5 w-5 text-primary" />
              البيانات الخام الكاملة
            </div>
            <pre className="max-h-[520px] overflow-auto rounded-md bg-muted p-3 text-xs" dir="ltr">
              {JSON.stringify(snapshot, null, 2)}
            </pre>
          </section>
        </>
      ) : null}
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-surface p-3">
      <div className="text-xs text-on-surface-variant">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-on-surface">{value}</div>
    </div>
  );
}

function Detail({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[150px_1fr]">
      <div className="text-xs text-on-surface-variant">{label}</div>
      <div className="break-all font-medium" dir={ltr ? "ltr" : undefined}>
        {value}
      </div>
    </div>
  );
}

function EndpointCard({
  endpoint,
  icon,
  children,
}: {
  endpoint: GooglePlayConsoleEndpointResult | null;
  icon: React.ReactNode;
  children?: React.ReactNode;
}) {
  if (!endpoint) return null;

  return (
    <div className="rounded-md border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-semibold">
          <span className="text-primary">{icon}</span>
          {endpoint.label}
        </div>
        <span
          className={`rounded-full px-2 py-1 text-xs ${
            endpoint.ok
              ? "bg-green-50 text-green-700"
              : "bg-amber-50 text-amber-800"
          }`}
        >
          {endpoint.ok ? "متاح" : "غير متاح"}
        </span>
      </div>
      {!endpoint.ok ? (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <div className="mb-1 flex items-center gap-2 font-medium">
            <AlertTriangle className="h-4 w-4" />
            لم تسمح Google بقراءة هذا الجزء.
          </div>
          <div className="break-words text-xs" dir="ltr">
            {endpoint.error}
          </div>
        </div>
      ) : (
        children ?? (
          <pre className="mt-3 max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs" dir="ltr">
            {JSON.stringify(endpoint.data, null, 2)}
          </pre>
        )
      )}
    </div>
  );
}

function TrackList({ data }: { data: unknown }) {
  const tracks = getArray(data, "tracks");
  if (!tracks.length) {
    return <div className="mt-3 text-sm text-on-surface-variant">لا توجد مسارات نشر متاحة.</div>;
  }

  return (
    <div className="mt-3 space-y-2">
      {tracks.map((track, index) => {
        const item = track as { track?: string; releases?: unknown[] };
        return (
          <div key={`${item.track ?? index}`} className="rounded-md border bg-muted p-3 text-sm">
            <div className="font-semibold" dir="ltr">{item.track ?? "-"}</div>
            {(item.releases ?? []).map((release, releaseIndex) => {
              const releaseItem = release as {
                name?: string;
                status?: string;
                versionCodes?: string[];
                userFraction?: number;
              };
              return (
                <div key={releaseIndex} className="mt-2 rounded-md bg-background p-2 text-xs">
                  <div className="font-medium">{releaseItem.name || "إصدار بدون اسم"}</div>
                  <div>
                    {(releaseItem.versionCodes ?? []).length
                      ? releaseStatusText(releaseItem.status ?? "unknown")
                      : "تعطيل/تهيئة مسار بدون حزمة إصدار"}
                  </div>
                  <div dir="ltr">status: {releaseItem.status ?? "-"}</div>
                  <div dir="ltr">versionCodes: {(releaseItem.versionCodes ?? []).join(", ") || "-"}</div>
                  {releaseItem.userFraction ? <div dir="ltr">rollout: {releaseItem.userFraction}</div> : null}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function PublishingStatusPanel({
  endpoint,
}: {
  endpoint: GooglePlayConsoleEndpointResult | null;
}) {
  if (!endpoint?.ok) return null;
  const releases = collectTrackReleases(endpoint.data);
  const published = releases.filter((release) => release.status === "completed");
  const versionedPublished = published.filter((release) => release.versioned);
  const disabledMarkers = published.filter((release) => !release.versioned);
  const drafts = releases.filter((release) => release.status === "draft");
  const rollout = releases.filter((release) => release.status === "inProgress");
  const halted = releases.filter((release) => release.status === "halted");

  return (
    <section className="rounded-md border bg-surface p-4">
      <div className="mb-3 flex items-center gap-2 font-semibold">
        <BadgeCheck className="h-5 w-5 text-primary" />
        حالة النشر حسب Google Play
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <ReleaseBucket title="منشور وموافق عليه" releases={versionedPublished} />
        <ReleaseBucket title="قيد الطرح التدريجي" releases={rollout} />
        <ReleaseBucket title="مسودات لم ترسل" releases={drafts} />
        <ReleaseBucket title="مسارات معطلة" releases={[...halted, ...disabledMarkers]} />
      </div>
      <div className="mt-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
        لا يعرض Android Publisher API حالة مراجعة منفصلة باسم “قيد المراجعة” ضمن بيانات المسارات. إذا كان هناك إصدار قيد مراجعة داخل واجهة Play Console ولم يظهر هنا، فهذا يعني أن Google لم يرجعه عبر صلاحيات API الحالية أو عبر نقطة المسارات.
      </div>
    </section>
  );
}

function BundleList({
  data,
  productionVersionCodes,
}: {
  data: unknown;
  productionVersionCodes: Set<string>;
}) {
  const bundles = getArray(data, "bundles") as Array<{
    versionCode?: number;
    sha1?: string;
    sha256?: string;
  }>;
  if (!bundles.length) {
    return <div className="mt-3 text-sm text-on-surface-variant">لا توجد حزم AAB.</div>;
  }

  const active = bundles.filter((bundle) =>
    productionVersionCodes.has(String(bundle.versionCode)),
  );
  const archived = bundles.filter(
    (bundle) => !productionVersionCodes.has(String(bundle.versionCode)),
  );

  return (
    <div className="mt-3 space-y-3 text-sm">
      <div className="rounded-md border border-green-200 bg-green-50 p-3 text-green-800">
        <div className="font-semibold">الحزم النشطة في production</div>
        <BundleRows bundles={active} />
      </div>
      {archived.length ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800">
          <div className="font-semibold">حزم موجودة في مكتبة Google Play وليست نشطة</div>
          <p className="mt-1 text-xs">
            Android Publisher API يعرض هذه الحزم من مكتبة AAB، لكنه لا يوفر أمر حذف لها؛ الحذف العملي يكون بإزالتها من مسارات النشر، وهذا تم بالفعل.
          </p>
          <BundleRows bundles={archived} />
        </div>
      ) : null}
    </div>
  );
}

function BundleRows({
  bundles,
}: {
  bundles: Array<{ versionCode?: number; sha1?: string; sha256?: string }>;
}) {
  if (!bundles.length) return <div className="mt-2 text-xs">لا يوجد</div>;
  return (
    <div className="mt-2 space-y-2">
      {bundles.map((bundle) => (
        <div key={bundle.versionCode} className="rounded-md bg-background p-2 text-xs" dir="ltr">
          <div>versionCode: {bundle.versionCode ?? "-"}</div>
          <div className="break-all">sha1: {bundle.sha1 ?? "-"}</div>
          <div className="break-all">sha256: {bundle.sha256 ?? "-"}</div>
        </div>
      ))}
    </div>
  );
}

function ReleaseBucket({
  title,
  releases,
}: {
  title: string;
  releases: ReturnType<typeof collectTrackReleases>;
}) {
  return (
    <div className="rounded-md border bg-muted p-3">
      <div className="text-xs font-semibold text-on-surface-variant">{title}</div>
      <div className="mt-2 space-y-2">
        {releases.length ? (
          releases.map((release, index) => (
            <div key={`${release.track}:${release.status}:${index}`} className="rounded-md bg-background p-2 text-xs">
              <div className="font-medium">{release.name}</div>
              <div dir="ltr">track: {release.track}</div>
              <div dir="ltr">versionCodes: {release.versionCodes.join(", ") || "-"}</div>
            </div>
          ))
        ) : (
          <div className="text-xs text-on-surface-variant">لا يوجد</div>
        )}
      </div>
    </div>
  );
}

function ListingList({ data }: { data: unknown }) {
  const listings = getArray(data, "listings");
  if (!listings.length) {
    return <div className="mt-3 text-sm text-on-surface-variant">لا توجد قوائم متجر متاحة.</div>;
  }

  return (
    <div className="mt-3 grid gap-2">
      {listings.map((listing, index) => {
        const item = listing as {
          language?: string;
          title?: string;
          shortDescription?: string;
        };
        return (
          <div key={`${item.language ?? index}`} className="rounded-md border bg-muted p-3 text-sm">
            <div className="font-semibold">{item.title || "-"}</div>
            <div className="text-xs text-on-surface-variant" dir="ltr">{item.language || "-"}</div>
            <div className="mt-2 text-xs">{item.shortDescription || "-"}</div>
          </div>
        );
      })}
    </div>
  );
}

function SimpleCount({
  data,
  itemKey,
  emptyText,
}: {
  data: unknown;
  itemKey: string;
  emptyText: string;
}) {
  const items = getArray(data, itemKey);
  if (!items.length) {
    return <div className="mt-3 text-sm text-on-surface-variant">{emptyText}</div>;
  }

  return (
    <pre className="mt-3 max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs" dir="ltr">
      {JSON.stringify(items, null, 2)}
    </pre>
  );
}
