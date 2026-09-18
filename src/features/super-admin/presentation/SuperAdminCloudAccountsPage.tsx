"use client";

import * as React from "react";

import { useSession } from "@/features/auth/ui";
import { isSuperAdmin } from "@/features/auth";

import { CLOUD_ACCOUNTS_COPY } from "./cloud-accounts-copy";
import type { CloudAccountsFacts } from "./cloud-accounts-facts.types";
import { SuperAdminCloudAccountsContent } from "./SuperAdminCloudAccountsContent";

function SuperAdminCloudAccountsLoading() {
  return (
    <div id='features-super-admin-presentation-superadmincloudaccountspage-div-1-atkgmx' className="p-4 text-sm text-on-surface-variant">{CLOUD_ACCOUNTS_COPY.loading}</div>
  );
}

function SuperAdminCloudAccountsForbidden() {
  return (
    <div id='features-super-admin-presentation-superadmincloudaccountspage-div-2-lbnt2b' className="mx-auto max-w-2xl p-6">
      <div id='features-super-admin-presentation-superadmincloudaccountspage-div-3-zgjk4l' className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        {CLOUD_ACCOUNTS_COPY.forbidden}
      </div>
    </div>
  );
}

export function SuperAdminCloudAccountsPage({ facts }: { facts: CloudAccountsFacts }) {
  const { session, isLoading } = useSession();
  const allowed = !isLoading && isSuperAdmin(session);

  if (isLoading) {
    return <SuperAdminCloudAccountsLoading />;
  }

  if (!allowed) {
    return <SuperAdminCloudAccountsForbidden />;
  }

  return <SuperAdminCloudAccountsContent facts={facts} />;
}
