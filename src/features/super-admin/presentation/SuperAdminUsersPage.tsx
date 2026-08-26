"use client";

import { formatAdminDate } from "@asol/format-core";

import * as React from "react";
import Link from "next/link";
import {
  Search,
  ShieldAlert,
  Trash2,
  UserCheck,
  UserRoundSearch,
} from "lucide-react";

import { asolApi } from "@/core/api/asol-api-client";
import { useAdminArabic } from "@/shared/i18n/use-admin-arabic";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { useSession } from "@/features/auth/ui";
import { markPendingAuthLoginCompleted } from "@/features/auth/ui";
import { isSuperAdmin } from "@/features/auth";
import { sessionService } from "@/features/auth/ui";
import { clearImageUploadClientState } from "@/features/storage";
import { notifications } from "@/features/notifications";
import type { UserSession } from "@/features/auth";
import {
  asolDbDeleteSuperAdminOriginalSession,
  asolDbSetSuperAdminOriginalSession,
} from "@asol/data-core/browser";
import { usePageSaveOperationScope } from "@/features/page-save/ui";

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

  /**
   * Deletion is staged, never run on tap.
   *
   * `@asol/page-save-core` is the only place ASOL performs a user-triggered
   * delete, so this page owns no delete button, no confirmation dialog, and no
   * result message: the header save icon and `PageSaveDialog` execute the
   * staged operation and report it. See docs/05-platform-features/page-save-system.md.
   */
  const deletionOperations = usePageSaveOperationScope({
    id: "super-admin-users",
    label: "بحث المستخدمين",
    returnPath: "/super-admin/users",
    enabled: allowed,
  });

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
  }, [formatApiError, maxProducts, minProducts, query, session, specialty, withProductsOnly]);

  React.useEffect(() => {
    if (allowed) void search();
  }, [allowed, search]);

  /**
   * Stage one account for deletion. Nothing is deleted here.
   *
   * The item id carries the uid, so re-tapping the same row restages rather
   * than queueing a second delete, and each row is its own checkbox in the
   * dialog. The label names the account because a super admin stages from a
   * list — the account named in the dialog is what makes the confirmation
   * mean something.
   */
  const stageUserDeletion = (user: AdminUserResult) => {
    setError("");
    const displayName = user.storeName || user.email || user.phone || user.uid;
    deletionOperations.stage({
      itemId: `super-admin-user-delete:${user.uid}`,
      kind: "delete",
      label: `حذف حساب: ${displayName}`,
      description: [
        `الهاتف: ${user.phone || "غير مسجل"}`,
        `المعرّف: ${user.uid}`,
        user.productCount > 0 ? `يملك ${user.productCount} منتج سيتم حذفها.` : null,
        "إجراء نهائي: يحذف البروفايل والصور والتخصصات ورموز الإشعارات والمنتجات، ويجهّل سجلات الطلبات.",
      ]
        .filter(Boolean)
        .join(" — "),
      execute: async () => {
        if (!session?.sessionToken || !isSuperAdmin(session)) return false;
        try {
          await asolApi.post(
            "/api/super-admin/users/delete",
            { targetUid: user.uid },
            { headers: { "x-asol-session-token": session.sessionToken } },
          );
          setResults((prev) => prev.filter((row) => row.uid !== user.uid));
          return true;
        } catch (err) {
          setError(formatApiError(err));
          return false;
        }
      },
    });
  };

  const impersonate = async (targetUid: string) => {
    if (!session?.sessionToken || !isSuperAdmin(session)) return;
    const sessionToken = session.sessionToken;
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
        { headers: { "x-asol-session-token": sessionToken } },
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
            بحث بالاسم، الهاتف، عدد المنتجات، التخصصات، فتح الحساب بصلاحياته أو حذفه نهائياً.
          </p>
        </div>
        <div className="rounded-lg border bg-amber-50 px-3 py-2 text-sm text-amber-800">
          الانتحال يعطي صلاحيات كاملة للحساب المختار.
        </div>
      </header>

      <section className="grid gap-3 rounded-lg border bg-surface p-3 md:grid-cols-[1.5fr_1fr_0.7fr_0.7fr_auto]">
        <label className="space-y-1">
          <span className="text-xs text-on-surface-variant">بحث عام</span>
          <Input ui={{ uid: "super-admin.users.query-GwD1jm", id: "super-admin.users.query", kind: "field", part: "filters" }}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="اسم، هاتف، بريد، UID"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-on-surface-variant">التخصص</span>
          <Input ui={{ uid: "super-admin.users.specialty-bCZ9GW", id: "super-admin.users.specialty", kind: "field", part: "filters" }}
            value={specialty}
            onChange={(event) => setSpecialty(event.target.value)}
            placeholder="pharmacies أو delivery"
            dir="ltr"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-on-surface-variant">أقل منتجات</span>
          <Input ui={{ uid: "super-admin.users.min-products-G3pF0t", id: "super-admin.users.min-products", kind: "field", part: "filters" }}
            value={minProducts}
            onChange={(event) => setMinProducts(event.target.value)}
            inputMode="numeric"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-on-surface-variant">أكثر منتجات</span>
          <Input ui={{ uid: "super-admin.users.max-products-38XEgN", id: "super-admin.users.max-products", kind: "field", part: "filters" }}
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
          <Button ui={{ uid: "super-admin.users.search-U4dE50", id: "super-admin.users.search", kind: "action", action: "search-users", part: "toolbar" }} type="button" onClick={search} disabled={loading}>
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
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => stageUserDeletion(user)}
                        disabled={
                          user.uid === session?.uid ||
                          Boolean(impersonatingUid) ||
                          deletionOperations.isStaged(
                            `super-admin-user-delete:${user.uid}`,
                          )
                        }
                        className="gap-1"
                      >
                        <Trash2 className="h-4 w-4" />
                        {deletionOperations.isStaged(
                          `super-admin-user-delete:${user.uid}`,
                        )
                          ? "بانتظار الحفظ"
                          : "تجهيز الحذف"}
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
        يتم تسجيل كل عملية انتحال أو حذف حساب في سجل النظام.
      </div>
    </main>
  );
}
