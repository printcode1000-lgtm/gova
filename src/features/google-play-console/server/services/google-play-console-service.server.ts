import "server-only";

import {
  assertGooglePlayConsoleAllowed,
  googlePlayConsoleEnvironment,
  resolveGooglePlayConsoleConfig,
} from "../../domain/development-guard.server";
import type {
  GooglePlayConsoleConfigStatus,
  GooglePlayConsoleEndpointResult,
  GooglePlayConsoleSnapshot,
} from "../../domain/types";
import {
  createGooglePlayAuthClient,
  resolveGooglePlayCredentials,
} from "./google-play-credentials.server";
import { withGooglePlayEditLock } from "./google-play-edit-lock.server";

const API_ROOT = "https://androidpublisher.googleapis.com/androidpublisher/v3";

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function countArray(value: unknown, key: string): number {
  if (!value || typeof value !== "object") return 0;
  const next = (value as Record<string, unknown>)[key];
  return Array.isArray(next) ? next.length : 0;
}

function countReleases(value: unknown): number {
  if (!value || typeof value !== "object") return 0;
  const tracks = (value as { tracks?: unknown }).tracks;
  if (!Array.isArray(tracks)) return 0;
  return tracks.reduce((sum, track) => {
    if (!track || typeof track !== "object") return sum;
    const releases = (track as { releases?: unknown }).releases;
    if (!Array.isArray(releases)) return sum;
    return (
      sum +
      releases.filter((release) => {
        if (!release || typeof release !== "object") return false;
        const versionCodes = (release as { versionCodes?: unknown }).versionCodes;
        return Array.isArray(versionCodes) && versionCodes.length > 0;
      }).length
    );
  }, 0);
}

export class GooglePlayConsoleService {
  async snapshot(): Promise<GooglePlayConsoleSnapshot> {
    return withGooglePlayEditLock(() => this.snapshotWithExclusiveEdit());
  }

  private async snapshotWithExclusiveEdit(): Promise<GooglePlayConsoleSnapshot> {
    assertGooglePlayConsoleAllowed();

    const config = await this.readConfigStatus();
    const { client, packageName } = await createGooglePlayAuthClient();
    const endpoints: GooglePlayConsoleEndpointResult[] = [];
    let editId: string | null = null;

    try {
      const edit = await client.request<{ id?: string }>({
        method: "POST",
        url: `${API_ROOT}/applications/${packageName}/edits`,
      });
      editId = edit.data.id ?? null;
    } catch (error) {
      endpoints.push({
        key: "edit",
        label: "فتح جلسة قراءة من Google Play",
        ok: false,
        data: null,
        error: toErrorMessage(error),
      });
    }

    if (editId) {
      await this.collectEndpoint(endpoints, "details", "تفاصيل التطبيق", () =>
        client.request({
          url: `${API_ROOT}/applications/${packageName}/edits/${encodeURIComponent(editId)}/details`,
        }),
      );
      await this.collectEndpoint(endpoints, "tracks", "مسارات النشر والإصدارات", () =>
        client.request({
          url: `${API_ROOT}/applications/${packageName}/edits/${encodeURIComponent(editId)}/tracks`,
        }),
      );
      await this.collectEndpoint(endpoints, "listings", "قوائم المتجر واللغات", () =>
        client.request({
          url: `${API_ROOT}/applications/${packageName}/edits/${encodeURIComponent(editId)}/listings`,
        }),
      );
      await this.collectEndpoint(endpoints, "apks", "ملفات APK داخل جلسة النشر", () =>
        client.request({
          url: `${API_ROOT}/applications/${packageName}/edits/${encodeURIComponent(editId)}/apks`,
        }),
      );
      await this.collectEndpoint(endpoints, "bundles", "حزم AAB داخل جلسة النشر", () =>
        client.request({
          url: `${API_ROOT}/applications/${packageName}/edits/${encodeURIComponent(editId)}/bundles`,
        }),
      );
    }

    await this.collectEndpoint(endpoints, "reviews", "مراجعات المستخدمين", () =>
      client.request({
        url: `${API_ROOT}/applications/${packageName}/reviews`,
        params: { maxResults: 100 },
      }),
    );
    await this.collectEndpoint(endpoints, "inAppProducts", "منتجات الشراء داخل التطبيق", () =>
      client.request({
        url: `${API_ROOT}/applications/${packageName}/inappproducts`,
      }),
    );
    await this.collectEndpoint(endpoints, "subscriptions", "الاشتراكات", () =>
      client.request({
        url: `${API_ROOT}/applications/${packageName}/subscriptions`,
      }),
    );

    if (editId) {
      await client
        .request({
          method: "DELETE",
          url: `${API_ROOT}/applications/${packageName}/edits/${encodeURIComponent(editId)}`,
        })
        .catch((deleteError) => {
          console.warn("[GooglePlayConsole] Failed to delete temporary edit.", deleteError);
        });
    }

    return {
      environment: googlePlayConsoleEnvironment(),
      fetchedAt: new Date().toISOString(),
      config,
      editId,
      endpoints,
      summary: this.buildSummary(endpoints),
    };
  }

  private async readConfigStatus(): Promise<GooglePlayConsoleConfigStatus> {
    const config = resolveGooglePlayConsoleConfig();
    const credentialResolution = await resolveGooglePlayCredentials();

    return {
      packageName: config.packageName,
      keyFilePath: credentialResolution.status.keyFilePath,
      keyFileExists: credentialResolution.status.keyFileExists,
      credentialSource: credentialResolution.status.source,
      serviceAccountEmail: credentialResolution.status.serviceAccountEmail,
      serviceAccountProjectId: credentialResolution.status.serviceAccountProjectId,
      serviceAccountUniqueId: credentialResolution.status.serviceAccountUniqueId,
    };
  }

  private async collectEndpoint<T>(
    endpoints: GooglePlayConsoleEndpointResult[],
    key: string,
    label: string,
    request: () => Promise<{ data: T }>,
  ) {
    try {
      const response = await request();
      endpoints.push({ key, label, ok: true, data: response.data });
    } catch (error) {
      endpoints.push({
        key,
        label,
        ok: false,
        data: null,
        error: toErrorMessage(error),
      });
    }
  }

  private buildSummary(endpoints: GooglePlayConsoleEndpointResult[]) {
    const successfulEndpoints = endpoints.filter((endpoint) => endpoint.ok).length;
    const failedEndpoints = endpoints.length - successfulEndpoints;
    const tracks = endpoints.find((endpoint) => endpoint.key === "tracks")?.data;
    const listings = endpoints.find((endpoint) => endpoint.key === "listings")?.data;
    const reviews = endpoints.find((endpoint) => endpoint.key === "reviews")?.data;
    const inAppProducts = endpoints.find((endpoint) => endpoint.key === "inAppProducts")?.data;
    const subscriptions = endpoints.find((endpoint) => endpoint.key === "subscriptions")?.data;

    return {
      successfulEndpoints,
      failedEndpoints,
      tracks: countArray(tracks, "tracks"),
      releases: countReleases(tracks),
      listings: countArray(listings, "listings"),
      reviews: countArray(reviews, "reviews"),
      inAppProducts: countArray(inAppProducts, "inappproduct"),
      subscriptions: countArray(subscriptions, "subscriptions"),
    };
  }
}

export const googlePlayConsoleService = new GooglePlayConsoleService();
