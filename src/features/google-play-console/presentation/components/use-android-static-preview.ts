"use client";

import * as React from "react";

import { asolApi } from "@/core/api";
import { PREVIEW_PROBE_TIMEOUT_MS, STATIC_PREVIEW_URL } from "./android-release-paths-data";

export type StaticPreviewState = "idle" | "checking" | "offline";

export function useAndroidStaticPreview() {
  const [previewState, setPreviewState] = React.useState<StaticPreviewState>("idle");

  const openPreview = async () => {
    setPreviewState("checking");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PREVIEW_PROBE_TIMEOUT_MS);
    try {
      await asolApi.getAbsoluteBinary(STATIC_PREVIEW_URL, {
        signal: controller.signal,
        suppressErrorLog: true,
      });
      setPreviewState("idle");
      window.open(STATIC_PREVIEW_URL, "_blank", "noopener,noreferrer");
    } catch {
      setPreviewState("offline");
    } finally {
      clearTimeout(timer);
    }
  };

  return { previewState, openPreview };
}
