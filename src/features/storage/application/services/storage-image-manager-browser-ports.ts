"use client";

import { asolApi } from "@/core/api";
import { configureStorageImageManagerCore } from "@asol/storage-image-manager-core/image-cache";

export function registerStorageImageManagerCoreBrowserPorts(): void {
  configureStorageImageManagerCore({
    downloadImage: async ({ url, etag }) => {
      const result = await asolApi.getAbsoluteBinaryResponse(url, {
        cache: "no-store",
        suppressErrorLog: true,
        ...(etag ? { headers: { "If-None-Match": etag } } : {}),
      });
      if (result.status === "not-modified") {
        return {
          status: "not-modified" as const,
          ...(result.etag ? { etag: result.etag } : {}),
        };
      }
      return {
        status: "ok" as const,
        blob: new Blob([result.data], {
          type: result.contentType || "application/octet-stream",
        }),
        ...(result.etag ? { etag: result.etag } : {}),
      };
    },
  });
}
