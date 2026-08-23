"use client";

import * as React from "react";

import { useSession } from "@/features/auth/ui";
import { isSuperAdmin } from "@/features/auth";

import { SuperAdminCloudAccountsContent } from "./SuperAdminCloudAccountsContent";

function SuperAdminCloudAccountsLoading() {
  return (
    <div className="p-4 text-sm text-on-surface-variant">جاري التحميل...</div>
  );
}

function SuperAdminCloudAccountsForbidden() {
  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        هذه الصفحة متاحة للسوبر أدمن فقط.
      </div>
    </div>
  );
}

export function SuperAdminCloudAccountsPage() {
  const { session, isLoading } = useSession();
  const allowed = !isLoading && isSuperAdmin(session);

  if (isLoading) {
    return <SuperAdminCloudAccountsLoading />;
  }

  if (!allowed) {
    return <SuperAdminCloudAccountsForbidden />;
  }

  return <SuperAdminCloudAccountsContent />;
}
