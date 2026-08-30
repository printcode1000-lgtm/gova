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
import { uiAttributes , createOpaqueUiInstanceId, composeUiInstanceId} from "@asol/ui-registry-core";

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
    return <div {...uiAttributes({ uid: "super-admin.super-admin-users-page.div.12-1iZsDh", id: "super-admin.super-admin-users-page.div.12" })} id="super-admin.super-admin-users-page.div" className="p-4 text-sm text-on-surface-variant">جاري التحميل...</div>;
  }

  if (!allowed) {
    return (
      <div {...uiAttributes({ uid: "super-admin.super-admin-users-page.div.13-6nJ47e", id: "super-admin.super-admin-users-page.div.13" })} id="super-admin.super-admin-users-page.div.2" className="mx-auto max-w-2xl p-6">
        <div {...uiAttributes({ uid: "super-admin.super-admin-users-page.div.14-ux29Ka", id: "super-admin.super-admin-users-page.div.14" })} id="super-admin.super-admin-users-page.div.3" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          هذه الصفحة متاحة للسوبر أدمن فقط.
        </div>
      </div>
    );
  }

  return (
    <main {...uiAttributes({ uid: "super-admin.super-admin-users-page.main.2-pv4U4N", id: "super-admin.super-admin-users-page.main.2" })} id="super-admin.super-admin-users-page.main" className="mx-auto w-full max-w-7xl space-y-5 p-4 pb-24">
      <header {...uiAttributes({ uid: "super-admin.super-admin-users-page.header.2-Vfq2JA", id: "super-admin.super-admin-users-page.header.2" })} id="super-admin.super-admin-users-page.header" className="flex flex-wrap items-center justify-between gap-3">
        <div {...uiAttributes({ uid: "super-admin.super-admin-users-page.div.15-h6nFrL", id: "super-admin.super-admin-users-page.div.15" })} id="super-admin.super-admin-users-page.div.4">
          <h1 {...uiAttributes({ uid: "super-admin.super-admin-users-page.h1.2-TjGf4R", id: "super-admin.super-admin-users-page.h1.2" })} id="super-admin.super-admin-users-page.h1" className="text-2xl font-semibold text-on-surface">
            بحث المستخدمين
          </h1>
          <p {...uiAttributes({ uid: "super-admin.super-admin-users-page.p.2-1OV2NY", id: "super-admin.super-admin-users-page.p.2" })} id="super-admin.super-admin-users-page.p" className="text-sm text-on-surface-variant">
            بحث بالاسم، الهاتف، عدد المنتجات، التخصصات، فتح الحساب بصلاحياته أو حذفه نهائياً.
          </p>
        </div>
        <div {...uiAttributes({ uid: "super-admin.super-admin-users-page.div.16-P5g3Th", id: "super-admin.super-admin-users-page.div.16" })} id="super-admin.super-admin-users-page.div.5" className="rounded-lg border bg-amber-50 px-3 py-2 text-sm text-amber-800">
          الانتحال يعطي صلاحيات كاملة للحساب المختار.
        </div>
      </header>

      <section {...uiAttributes({ uid: "super-admin.super-admin-users-page.section.3-eec3kS", id: "super-admin.super-admin-users-page.section.3" })} id="super-admin.super-admin-users-page.section" className="grid gap-3 rounded-lg border bg-surface p-3 md:grid-cols-[1.5fr_1fr_0.7fr_0.7fr_auto]">
        <label {...uiAttributes({ uid: "super-admin.super-admin-users-page.label.6-r4kyEN", id: "super-admin.super-admin-users-page.label.6" })} id="super-admin.super-admin-users-page.label" className="space-y-1">
          <span {...uiAttributes({ uid: "super-admin.super-admin-users-page.span.6-IMkig2", id: "super-admin.super-admin-users-page.span.6" })} id="super-admin.super-admin-users-page.span" className="text-xs text-on-surface-variant">بحث عام</span>
          <Input id="super-admin.super-admin-users-page.input.2" ui={{ uid: "super-admin.users.query-GwD1jm", id: "super-admin.users.query", kind: "field", part: "filters" }}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="اسم، هاتف، بريد، UID"
          />
        </label>
        <label {...uiAttributes({ uid: "super-admin.super-admin-users-page.label.7-LERv6H", id: "super-admin.super-admin-users-page.label.7" })} id="super-admin.super-admin-users-page.label.2" className="space-y-1">
          <span {...uiAttributes({ uid: "super-admin.super-admin-users-page.span.7-2mKjeZ", id: "super-admin.super-admin-users-page.span.7" })} id="super-admin.super-admin-users-page.span.2" className="text-xs text-on-surface-variant">التخصص</span>
          <Input id="super-admin.super-admin-users-page.input.3" ui={{ uid: "super-admin.users.specialty-bCZ9GW", id: "super-admin.users.specialty", kind: "field", part: "filters" }}
            value={specialty}
            onChange={(event) => setSpecialty(event.target.value)}
            placeholder="pharmacies أو delivery"
            dir="ltr"
          />
        </label>
        <label {...uiAttributes({ uid: "super-admin.super-admin-users-page.label.8-UXY1xt", id: "super-admin.super-admin-users-page.label.8" })} id="super-admin.super-admin-users-page.label.3" className="space-y-1">
          <span {...uiAttributes({ uid: "super-admin.super-admin-users-page.span.8-22T5Ho", id: "super-admin.super-admin-users-page.span.8" })} id="super-admin.super-admin-users-page.span.3" className="text-xs text-on-surface-variant">أقل منتجات</span>
          <Input id="super-admin.super-admin-users-page.input.4" ui={{ uid: "super-admin.users.min-products-G3pF0t", id: "super-admin.users.min-products", kind: "field", part: "filters" }}
            value={minProducts}
            onChange={(event) => setMinProducts(event.target.value)}
            inputMode="numeric"
          />
        </label>
        <label {...uiAttributes({ uid: "super-admin.super-admin-users-page.label.9-FlIU4J", id: "super-admin.super-admin-users-page.label.9" })} id="super-admin.super-admin-users-page.label.4" className="space-y-1">
          <span {...uiAttributes({ uid: "super-admin.super-admin-users-page.span.9-N0Jz8K", id: "super-admin.super-admin-users-page.span.9" })} id="super-admin.super-admin-users-page.span.4" className="text-xs text-on-surface-variant">أكثر منتجات</span>
          <Input id="super-admin.super-admin-users-page.input.5" ui={{ uid: "super-admin.users.max-products-38XEgN", id: "super-admin.users.max-products", kind: "field", part: "filters" }}
            value={maxProducts}
            onChange={(event) => setMaxProducts(event.target.value)}
            inputMode="numeric"
          />
        </label>
        <div {...uiAttributes({ uid: "super-admin.super-admin-users-page.div.17-w0FX3I", id: "super-admin.super-admin-users-page.div.17" })} id="super-admin.super-admin-users-page.div.6" className="flex items-end gap-2">
          <label {...uiAttributes({ uid: "super-admin.super-admin-users-page.label.10-qAK2NN", id: "super-admin.super-admin-users-page.label.10" })} id="super-admin.super-admin-users-page.label.5" className="flex h-10 items-center gap-2 whitespace-nowrap rounded-md border px-3 text-sm">
            <input {...uiAttributes({ uid: "super-admin.super-admin-users-page.input.6-yGj8n4", id: "super-admin.super-admin-users-page.input.6" })} id="super-admin.super-admin-users-page.input"
              type="checkbox"
              checked={withProductsOnly}
              onChange={(event) => setWithProductsOnly(event.target.checked)}
            />
            لديهم منتجات
          </label>
          <Button id="super-admin.super-admin-users-page.button" ui={{ uid: "super-admin.users.search-U4dE50", id: "super-admin.users.search", kind: "action", action: "search-users", part: "toolbar" }} type="button" onClick={search} disabled={loading}>
            <Search id="super-admin.super-admin-users-page.search" className="h-4 w-4" />
            {loading ? "بحث..." : "بحث"}
          </Button>
        </div>
      </section>

      {error ? (
        <div {...uiAttributes({ uid: "super-admin.super-admin-users-page.div.18-2q4FNm", id: "super-admin.super-admin-users-page.div.18" })} id="super-admin.super-admin-users-page.div.7" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section {...uiAttributes({ uid: "super-admin.super-admin-users-page.section.4-CNGbu7", id: "super-admin.super-admin-users-page.section.4" })} id="super-admin.super-admin-users-page.section.2" className="overflow-hidden rounded-lg border bg-surface">
        <div {...uiAttributes({ uid: "super-admin.super-admin-users-page.div.19-JcR1iN", id: "super-admin.super-admin-users-page.div.19" })} id="super-admin.super-admin-users-page.div.8" className="flex items-center justify-between border-b p-3">
          <div {...uiAttributes({ uid: "super-admin.super-admin-users-page.div.20-uMZ45t", id: "super-admin.super-admin-users-page.div.20" })} id="super-admin.super-admin-users-page.div.9" className="flex items-center gap-2 text-sm font-semibold">
            <UserRoundSearch id="super-admin.super-admin-users-page.user-round-search" className="h-4 w-4" />
            النتائج
          </div>
          <span {...uiAttributes({ uid: "super-admin.super-admin-users-page.span.10-RWe641", id: "super-admin.super-admin-users-page.span.10" })} id="super-admin.super-admin-users-page.span.5" className="text-xs text-on-surface-variant">
            {results.length} مستخدم
          </span>
        </div>
        <div {...uiAttributes({ uid: "super-admin.super-admin-users-page.div.21-7IXDih", id: "super-admin.super-admin-users-page.div.21" })} id="super-admin.super-admin-users-page.div.10" className="overflow-x-auto">
          <table {...uiAttributes({ uid: "super-admin.super-admin-users-page.table.2-1vAAZE", id: "super-admin.super-admin-users-page.table.2" })} id="super-admin.super-admin-users-page.table" className="w-full min-w-[980px] text-sm">
            <thead {...uiAttributes({ uid: "super-admin.super-admin-users-page.thead.2-fjKEH5", id: "super-admin.super-admin-users-page.thead.2" })} id="super-admin.super-admin-users-page.thead" className="bg-muted/50 text-xs text-on-surface-variant">
              <tr {...uiAttributes({ uid: "super-admin.super-admin-users-page.tr.3-2JWL4i", id: "super-admin.super-admin-users-page.tr.3" })} id="super-admin.super-admin-users-page.tr">
                <th {...uiAttributes({ uid: "super-admin.super-admin-users-page.th.7-3PZbx3", id: "super-admin.super-admin-users-page.th.7" })} id="super-admin.super-admin-users-page.th" className="p-3 text-start">المستخدم</th>
                <th {...uiAttributes({ uid: "super-admin.super-admin-users-page.th.8-9iY0Qe", id: "super-admin.super-admin-users-page.th.8" })} id="super-admin.super-admin-users-page.th.2" className="p-3 text-start">الهاتف</th>
                <th {...uiAttributes({ uid: "super-admin.super-admin-users-page.th.9-YqUaJ9", id: "super-admin.super-admin-users-page.th.9" })} id="super-admin.super-admin-users-page.th.3" className="p-3 text-start">المنتجات</th>
                <th {...uiAttributes({ uid: "super-admin.super-admin-users-page.th.10-K4jcFC", id: "super-admin.super-admin-users-page.th.10" })} id="super-admin.super-admin-users-page.th.4" className="p-3 text-start">التخصصات</th>
                <th {...uiAttributes({ uid: "super-admin.super-admin-users-page.th.11-brQZ87", id: "super-admin.super-admin-users-page.th.11" })} id="super-admin.super-admin-users-page.th.5" className="p-3 text-start">التواريخ</th>
                <th {...uiAttributes({ uid: "super-admin.super-admin-users-page.th.12-FI3GDc", id: "super-admin.super-admin-users-page.th.12" })} id="super-admin.super-admin-users-page.th.6" className="p-3 text-start">إجراءات</th>
              </tr>
            </thead>
            <tbody {...uiAttributes({ uid: "super-admin.super-admin-users-page.tbody.2-SRdo1H", id: "super-admin.super-admin-users-page.tbody.2" })} id="super-admin.super-admin-users-page.tbody">
              {results.map((user) => (
                <tr key={user.uid} {...uiAttributes({ uid: "super-admin.super-admin-users-page.tr.4-2RCIDC", id: "super-admin.super-admin-users-page.tr.4" , instance: createOpaqueUiInstanceId("iter-18f5d51792", String(user.uid))})} className="border-t align-top">
                  <td {...uiAttributes({ uid: "super-admin.super-admin-users-page.td.2-k0IG3Q", id: "super-admin.super-admin-users-page.td.2" , instance: createOpaqueUiInstanceId("iter-c1f87a6e4b", String(user.uid))})} className="max-w-xs p-3">
                    <div {...uiAttributes({ uid: "super-admin.super-admin-users-page.div.22-0RL7g1", id: "super-admin.super-admin-users-page.div.22" , instance: createOpaqueUiInstanceId("iter-e9b98f348d", String(user.uid))})} className="font-medium">
                      {user.storeName || user.email || user.uid}
                    </div>
                    <div {...uiAttributes({ uid: "super-admin.super-admin-users-page.div.23-DIXQT6", id: "super-admin.super-admin-users-page.div.23" , instance: createOpaqueUiInstanceId("iter-a1f3bb1d33", String(user.uid))})} className="mt-1 break-all text-xs text-on-surface-variant">
                      {user.uid}
                    </div>
                    {user.storeDescription ? (
                      <div {...uiAttributes({ uid: "super-admin.super-admin-users-page.div.24-s7qiAC", id: "super-admin.super-admin-users-page.div.24" , instance: createOpaqueUiInstanceId("iter-d7b23062c2", String(user.uid))})} className="mt-1 line-clamp-2 text-xs text-on-surface-variant">
                        {user.storeDescription}
                      </div>
                    ) : null}
                  </td>
                  <td {...uiAttributes({ uid: "super-admin.super-admin-users-page.td.3-iSlnj1", id: "super-admin.super-admin-users-page.td.3" , instance: createOpaqueUiInstanceId("iter-93d71a18bb", String(user.uid))})} className="p-3" dir="ltr">
                    {user.phone || "-"}
                    {user.email ? (
                      <div {...uiAttributes({ uid: "super-admin.super-admin-users-page.div.25-UN7pxD", id: "super-admin.super-admin-users-page.div.25" , instance: createOpaqueUiInstanceId("iter-6970f6b3ee", String(user.uid))})} className="mt-1 text-xs text-on-surface-variant">
                        {user.email}
                      </div>
                    ) : null}
                  </td>
                  <td {...uiAttributes({ uid: "super-admin.super-admin-users-page.td.4-6LtjIX", id: "super-admin.super-admin-users-page.td.4" , instance: createOpaqueUiInstanceId("iter-047abcb7c4", String(user.uid))})} className="p-3">
                    <span {...uiAttributes({ uid: "super-admin.super-admin-users-page.span.11-pY4fKq", id: "super-admin.super-admin-users-page.span.11" , instance: createOpaqueUiInstanceId("iter-d54c4566c8", String(user.uid))})} className="rounded-full bg-primary/10 px-2 py-1 text-primary">
                      {user.productCount}
                    </span>
                    <div {...uiAttributes({ uid: "super-admin.super-admin-users-page.div.26-pPSH8p", id: "super-admin.super-admin-users-page.div.26" , instance: createOpaqueUiInstanceId("iter-b06938c8ed", String(user.uid))})} className="mt-2 text-xs text-on-surface-variant">
                      {user.hasProfile ? "له بروفايل" : "بدون بروفايل"}
                    </div>
                  </td>
                  <td {...uiAttributes({ uid: "super-admin.super-admin-users-page.td.5-4aMSmR", id: "super-admin.super-admin-users-page.td.5" , instance: createOpaqueUiInstanceId("iter-d7d1eeb9b5", String(user.uid))})} className="max-w-md p-3">
                    <div {...uiAttributes({ uid: "super-admin.super-admin-users-page.div.27-iK9XLk", id: "super-admin.super-admin-users-page.div.27" , instance: createOpaqueUiInstanceId("iter-597f10c281", String(user.uid))})} className="flex flex-wrap gap-1">
                      {user.specialties.slice(0, 8).map((item) => (
                        <span
                          key={item} {...uiAttributes({ uid: "super-admin.super-admin-users-page.span.12-B3DayU", id: "super-admin.super-admin-users-page.span.12" , instance: composeUiInstanceId(createOpaqueUiInstanceId("iter-9e1fd068c2", String(item)), createOpaqueUiInstanceId("iter-9b4a9431dd", String(item)))})}
                          className="rounded-full border px-2 py-1 text-xs"
                        >
                          {specialtyLabel(item)}
                        </span>
                      ))}
                      {user.specialties.length > 8 ? (
                        <span {...uiAttributes({ uid: "super-admin.super-admin-users-page.span.13-0AG0Ml", id: "super-admin.super-admin-users-page.span.13" , instance: createOpaqueUiInstanceId("iter-942994bd94", String(user.uid))})} className="rounded-full border px-2 py-1 text-xs">
                          +{user.specialties.length - 8}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td {...uiAttributes({ uid: "super-admin.super-admin-users-page.td.6-mOlV6W", id: "super-admin.super-admin-users-page.td.6" , instance: createOpaqueUiInstanceId("iter-811b017942", String(user.uid))})} className="p-3 text-xs text-on-surface-variant">
                    <div {...uiAttributes({ uid: "super-admin.super-admin-users-page.div.28-OQx94z", id: "super-admin.super-admin-users-page.div.28" , instance: createOpaqueUiInstanceId("iter-bf22a3f2ff", String(user.uid))})}>تسجيل: {dateText(user.createdAt)}</div>
                    <div {...uiAttributes({ uid: "super-admin.super-admin-users-page.div.29-BljQ0S", id: "super-admin.super-admin-users-page.div.29" , instance: createOpaqueUiInstanceId("iter-f74e7017c3", String(user.uid))})}>آخر دخول: {dateText(user.lastLoginAt)}</div>
                  </td>
                  <td {...uiAttributes({ uid: "super-admin.super-admin-users-page.td.7-48adPP", id: "super-admin.super-admin-users-page.td.7" , instance: createOpaqueUiInstanceId("iter-b600f72090", String(user.uid))})} className="p-3">
                    <div {...uiAttributes({ uid: "super-admin.super-admin-users-page.div.30-SAXz5T", id: "super-admin.super-admin-users-page.div.30" , instance: createOpaqueUiInstanceId("iter-7f5f4eefa7", String(user.uid))})} className="flex flex-wrap gap-2">
                      <Button ui={{ uid: "super-admin.super-admin-users-page.button.2-31Nz6b", id: "super-admin.super-admin-users-page.button.2" , instance: createOpaqueUiInstanceId("iter-1fb8c9e745", String(user.uid))}} asChild variant="outline" size="sm">
                        <Link href={`/profile?mode=preview&uid=${user.uid}`}>
                          البروفايل
                        </Link>
                      </Button>
                      <Button ui={{ uid: "super-admin.super-admin-users-page.button.3-AzAM0e", id: "super-admin.super-admin-users-page.button.3" , instance: createOpaqueUiInstanceId("iter-cbce58106a", String(user.uid))}}
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
                      <Button ui={{ uid: "super-admin.super-admin-users-page.button.4-VHi6rY", id: "super-admin.super-admin-users-page.button.4" , instance: createOpaqueUiInstanceId("iter-adfbe485ac", String(user.uid))}}
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
                <tr {...uiAttributes({ uid: "super-admin.super-admin-users-page.tr.5-Uvzdp8", id: "super-admin.super-admin-users-page.tr.5" })} id="super-admin.super-admin-users-page.tr.2">
                  <td {...uiAttributes({ uid: "super-admin.super-admin-users-page.td.8-SG0GAa", id: "super-admin.super-admin-users-page.td.8" })} id="super-admin.super-admin-users-page.td" colSpan={6} className="p-8 text-center text-on-surface-variant">
                    لا توجد نتائج مطابقة.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <div {...uiAttributes({ uid: "super-admin.super-admin-users-page.div.31-9VWCkt", id: "super-admin.super-admin-users-page.div.31" })} id="super-admin.super-admin-users-page.div.11" className="flex items-center gap-2 rounded-lg border bg-amber-50 p-3 text-sm text-amber-800">
        <ShieldAlert id="super-admin.super-admin-users-page.shield-alert" className="h-4 w-4" />
        يتم تسجيل كل عملية انتحال أو حذف حساب في سجل النظام.
      </div>
    </main>
  );
}
