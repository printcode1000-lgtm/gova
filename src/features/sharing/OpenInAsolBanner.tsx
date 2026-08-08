"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

import { isNativePlatform } from "@/native-platform";
import {
  APPLE_APP_STORE_INSTALL_URL,
  GOOGLE_PLAY_INSTALL_URL,
} from "./share-links";

export function OpenInAsolBanner({ locale }: { locale: "ar" | "en" }) {
  const [installUrl, setInstallUrl] = useState("");
  const ar = locale === "ar";

  useEffect(() => {
    if (isNativePlatform()) return;
    const ios =
      /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setInstallUrl(ios ? APPLE_APP_STORE_INSTALL_URL : GOOGLE_PLAY_INSTALL_URL);
  }, []);

  if (!installUrl) return null;
  const appStore = installUrl === APPLE_APP_STORE_INSTALL_URL;

  return (
    <aside
      className="fixed inset-x-3 bottom-[calc(1rem+var(--asol-safe-area-bottom))] z-40 mx-auto flex max-w-xl items-center gap-3 rounded-2xl border border-primary/25 bg-surface/95 p-3 shadow-2xl backdrop-blur-xl"
      aria-label={ar ? "تثبيت تطبيق ASOL" : "Install the ASOL app"}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Download className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-on-surface">
          {ar
            ? "استمتع بالتجربة الكاملة على ASOL"
            : "Get the full ASOL experience"}
        </p>
        <a
          href={installUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex text-xs font-bold text-primary hover:underline"
        >
          {appStore
            ? ar
              ? "التثبيت من App Store"
              : "Install from the App Store"
            : ar
              ? "التثبيت من Google Play"
              : "Install from Google Play"}
        </a>
      </div>
      <button
        type="button"
        onClick={() => setInstallUrl("")}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={ar ? "إغلاق" : "Close"}
      >
        <X className="h-4 w-4" />
      </button>
    </aside>
  );
}
