"use client";

import { formatAdminDate } from "@asol/format-core";

import * as React from "react";
import Link from "next/link";
import { Search, ShieldAlert, UserCheck, UserRoundSearch } from "lucide-react";

import { asolApi } from "@/core/api/asol-api-client";
import { useAdminArabic } from "@/lib/i18n/use-admin-arabic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "@/features/auth/components/SessionProvider";
import { markPendingAuthLoginCompleted } from "@/features/auth/application/auth-lifecycle-events";
import { isSuperAdmin } from "@/features/auth/utils/super-admin";
import { sessionService } from "@/features/auth/services/session-service";
import { clearImageUploadClientState } from "@/features/storage/services/image-upload-client-lifecycle";
import { notifications } from "@/features/notifications";
import type { UserSession } from "@/features/auth/entities/session.entity";
import {
  asolDbDeleteSuperAdminOriginalSession,
  asolDbSetSuperAdminOriginalSession,
} from "@asol/data-core/browser";

interface AdminUserResult {
  uid: string;
  phone: string;
  email: string;
  storeName: string;
  storeDescription: string;
  productCount: number;
  specialties: string[];
  createdAt: string;
  lastLoginAt: string;
  hasProfile: boolean;
}

interface SearchResponse {
  results: AdminUserResult[];
}

const dateText = formatAdminDate;

function specialtyLabel(value: string) {
  return value.replace(/_/g, " ");
}

export function SuperAdminUsersPage() {
  const { formatApiError } = useAdminArabic();
  const { session, isLoading, setSession } = useSession();
  const allowed = !isLoading && isSuperAdmin(session);
  const [query, setQuery] = React.useState("");
  const [specialty, setSpecialty] = React.useState("");
  const [minProducts, setMinProducts] = React.useState("");
  const [maxProducts, setMaxProducts] = React.useState("");
  const [withProductsOnly, setWithProductsOnly] = React.useState(false);
  const [results, setResults] = React.useState<AdminUserResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [impersonatingUid, setImpersonatingUid] = React.useState("");

  const search = React.useCallback(async () => {
    if (!session?.sessionToken || !isSuperAdmin(session)) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        q: query.trim(),
        specialty: specialty.trim(),
        minProducts: minProducts.trim(),
        maxProducts: maxProducts.trim(),
        withProductsOnly: withProductsOnly ? "1" : "0",
        limit: "100",
      });
      const data = await asolApi.get<SearchResponse>(
        `/api/super-admin/users/search?${params.toString()}`,
        { headers: { "x-asol-session-token": session.sessionToken } },
      );
      setResults(data.results);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, [maxProducts, minProducts, query, session, specialty, withProductsOnly]);

  React.useEffect(() => {
    if (allowed) void search();
  }, [allowed, search]);

  const impersonate = async (targetUid: string) => {
    if (!session?.sessionToken || !isSuperAdmin(session)) return;
    setImpersonatingUid(targetUid);
    setError("");
    const superAdminSession = session;
    try {
      try {
        await notifications.unregisterDevice({
          uid: superAdminSession.uid,
          phone: superAdminSession.phone ?? "",
        });
      } catch {
        // Never block impersonation on push cleanup failure.
      }
      await asolDbDeleteSuperAdminOriginalSession();
      await asolDbSetSuperAdminOriginalSession<UserSession>(superAdminSession);
      const next = await asolApi.post<UserSession>(
        "/api/super-admin/impersonate",
        {
          targetUid,
        },
        { headers: { "x-asol-session-token": superAdminSession.sessionToken } },
      );
      await clearImageUploadClientState();
      const stored = await sessionService.saveSession(next);
      await markPendingAuthLoginCompleted({
        uid: stored.uid,
        phone: stored.phone,
      });
      setSession(stored);
      window.location.assign("/profile?mode=edit");
    } catch (err) {
      await asolDbDeleteSuperAdminOriginalSession();
      setError(formatApiError(err));
    } finally {
      setImpersonatingUid("");
    }
  };

  if (isLoading) {
    return <div className="p-4 text-sm text-on-surface-variant">جاري التحميل...</div>;
  }

  if (!allowed) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          هذه الصفحة متاحة للسوبر أدمن فقط.
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-5 p-4 pb-24">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-on-surface">
            بحث المستخدمين
          </h1>
          <p className="text-sm text-on-surface-variant">
            بحث بالاسم، الهاتف، عدد المنتجات، التخصصات، وفتح الحساب بصلاحيات صاحبه.
          </p>
        </div>
        <div className="rounded-lg border bg-amber-50 px-3 py-2 text-sm text-amber-800">
          الانتحال يعطي صلاحيات كاملة للحساب المختار.
        </div>
      </header>

      <section className="grid gap-3 rounded-lg border bg-surface p-3 md:grid-cols-[1.5fr_1fr_0.7fr_0.7fr_auto]">
        <label className="space-y-1">
          <span className="text-xs text-on-surface-variant">بحث عام</span>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="اسم، هاتف، بريد، UID"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-on-surface-variant">التخصص</span>
          <Input
            value={specialty}
            onChange={(event) => setSpecialty(event.target.value)}
            placeholder="pharmacies أو delivery"
            dir="ltr"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-on-surface-variant">أقل منتجات</span>
          <Input
            value={minProducts}
            onChange={(event) => setMinProducts(event.target.value)}
            inputMode="numeric"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-on-surface-variant">أكثر منتجات</span>
          <Input
            value={maxProducts}
            onChange={(event) => setMaxProducts(event.target.value)}
            inputMode="numeric"
          />
        </label>
        <div className="flex items-end gap-2">
          <label className="flex h-10 items-center gap-2 whitespace-nowrap rounded-md border px-3 text-sm">
            <input
              type="checkbox"
              checked={withProductsOnly}
              onChange={(event) => setWithProductsOnly(event.target.checked)}
            />
            لديهم منتجات
          </label>
          <Button type="button" onClick={search} disabled={loading}>
            <Search className="h-4 w-4" />
            {loading ? "بحث..." : "بحث"}
          </Button>
        </div>
      </section>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-lg border bg-surface">
        <div className="flex items-center justify-between border-b p-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <UserRoundSearch className="h-4 w-4" />
            النتائج
          </div>
          <span className="text-xs text-on-surface-variant">
            {results.length} مستخدم
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-muted/50 text-xs text-on-surface-variant">
              <tr>
                <th className="p-3 text-start">المستخدم</th>
                <th className="p-3 text-start">الهاتف</th>
                <th className="p-3 text-start">المنتجات</th>
                <th className="p-3 text-start">التخصصات</th>
                <th className="p-3 text-start">التواريخ</th>
                <th className="p-3 text-start">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {results.map((user) => (
                <tr key={user.uid} className="border-t align-top">
                  <td className="max-w-xs p-3">
                    <div className="font-medium">
                      {user.storeName || user.email || user.uid}
                    </div>
                    <div className="mt-1 break-all text-xs text-on-surface-variant">
                      {user.uid}
                    </div>
                    {user.storeDescription ? (
                      <div className="mt-1 line-clamp-2 text-xs text-on-surface-variant">
                        {user.storeDescription}
                      </div>
                    ) : null}
                  </td>
                  <td className="p-3" dir="ltr">
                    {user.phone || "-"}
                    {user.email ? (
                      <div className="mt-1 text-xs text-on-surface-variant">
                        {user.email}
                      </div>
                    ) : null}
                  </td>
                  <td className="p-3">
                    <span className="rounded-full bg-primary/10 px-2 py-1 text-primary">
                      {user.productCount}
                    </span>
                    <div className="mt-2 text-xs text-on-surface-variant">
                      {user.hasProfile ? "له بروفايل" : "بدون بروفايل"}
                    </div>
                  </td>
                  <td className="max-w-md p-3">
                    <div className="flex flex-wrap gap-1">
                      {user.specialties.slice(0, 8).map((item) => (
                        <span
                          key={item}
                          className="rounded-full border px-2 py-1 text-xs"
                        >
                          {specialtyLabel(item)}
                        </span>
                      ))}
                      {user.specialties.length > 8 ? (
                        <span className="rounded-full border px-2 py-1 text-xs">
                          +{user.specialties.length - 8}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="p-3 text-xs text-on-surface-variant">
                    <div>تسجيل: {dateText(user.createdAt)}</div>
                    <div>آخر دخول: {dateText(user.lastLoginAt)}</div>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/profile?mode=preview&uid=${user.uid}`}>
                          البروفايل
                        </Link>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => impersonate(user.uid)}
                        disabled={Boolean(impersonatingUid)}
                      >
                        {impersonatingUid === user.uid ? (
                          "جاري الدخول..."
                        ) : (
                          <>
                            <UserCheck className="h-4 w-4" />
                            دخول كصاحب الحساب
                          </>
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {results.length === 0 && !loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-on-surface-variant">
                    لا توجد نتائج مطابقة.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex items-center gap-2 rounded-lg border bg-amber-50 p-3 text-sm text-amber-800">
        <ShieldAlert className="h-4 w-4" />
        يتم تسجيل كل عملية انتحال في سجل النظام.
      </div>
    </main>
  );
}
