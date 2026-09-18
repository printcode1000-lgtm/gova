"use client";

import * as React from "react";

import { asolApi } from "@/core/api";

import type {
  CloudAccountsLiveUsage,
  LiveCloudAccountsResponse,
} from "./cloud-accounts-facts.types";

export type CloudAccountsTab = "general" | "vercel" | "turso" | "cloudflare";

type LiveSource = keyof CloudAccountsLiveUsage;

/**
 * Which live reads each tab triggers.
 *
 * Opening a tab re-reads every provider value that tab shows, every time it is
 * opened; the committed snapshot is only the fallback for an account whose live
 * read fails. The general tab shows only facts the server derived for this page
 * load, so it needs no live read.
 */
export const CLOUD_ACCOUNTS_LIVE_SOURCES: {
  readonly [Tab in CloudAccountsTab]: readonly { readonly source: LiveSource; readonly path: string }[];
} = {
  general: [],
  vercel: [{ source: "vercel", path: "/api/dev/cloud-accounts/vercel-usage" }],
  turso: [{ source: "turso", path: "/api/dev/cloud-accounts/turso-usage" }],
  cloudflare: [
    { source: "r2Usage", path: "/api/dev/cloud-accounts/r2-usage" },
    { source: "r2Contents", path: "/api/dev/cloud-accounts/r2-contents" },
  ],
};

const EMPTY_LIVE_USAGE: CloudAccountsLiveUsage = {
  vercel: {},
  turso: {},
  r2Usage: {},
  r2Contents: {},
};

export function useCloudAccountsLiveUsage(
  activeTab: CloudAccountsTab,
  sessionToken: string | undefined,
): CloudAccountsLiveUsage {
  const [live, setLive] = React.useState<CloudAccountsLiveUsage>(EMPTY_LIVE_USAGE);

  React.useEffect(() => {
    if (!sessionToken) return;
    const controller = new AbortController();
    const requestOptions = {
      headers: { "x-asol-session-token": sessionToken },
      signal: controller.signal,
      cache: "no-store" as const,
      localReadPolicy: "networkAuthoritative" as const,
      suppressErrorLog: true,
    };

    for (const { source, path } of CLOUD_ACCOUNTS_LIVE_SOURCES[activeTab]) {
      void asolApi
        .get<LiveCloudAccountsResponse<{ readonly id: string }>>(path, requestOptions)
        .then((response) => {
          const rows = Object.fromEntries(response.accounts.map((row) => [row.id, row]));
          setLive((current) => ({ ...current, [source]: rows }));
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
        });
    }

    return () => controller.abort();
  }, [activeTab, sessionToken]);

  return live;
}
