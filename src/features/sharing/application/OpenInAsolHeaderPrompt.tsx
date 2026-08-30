"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Download } from "lucide-react";

import { isNativePlatform } from '@asol/native-core';
import {
  APPLE_APP_STORE_INSTALL_URL,
  GOOGLE_PLAY_INSTALL_URL,
} from "./share-links";

export interface AsolInstallPrompt {
  installUrl: string;
  store: "app-store" | "google-play";
}

function isInstallSurface(
  pathname: string,
  searchParams: Pick<URLSearchParams, "get">,
): boolean {
  if (pathname === "/s/product" || pathname === "/s/profile") return true;

  if (pathname === "/product") {
    const mode = searchParams.get("mode");
    return (
      mode !== "edit" &&
      mode !== "new" &&
      Boolean(searchParams.get("productId")?.trim())
    );
  }

  return pathname === "/profile" && searchParams.get("mode") !== "edit";
}

/**
 * Resolves the single header prompt policy for public product/profile views.
 * Route, platform, and store selection stay inside the sharing module so the
 * application shell only renders the returned presentation model.
 */
export function useOpenInAsolHeaderPrompt(): AsolInstallPrompt | null {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [prompt, setPrompt] = useState<AsolInstallPrompt | null>(null);

  useEffect(() => {
    if (!isInstallSurface(pathname, searchParams) || isNativePlatform()) {
      setPrompt(null);
      return;
    }

    const ios =
      /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (ios) {
      setPrompt(
        APPLE_APP_STORE_INSTALL_URL
          ? {
              installUrl: APPLE_APP_STORE_INSTALL_URL,
              store: "app-store",
            }
          : null,
      );
      return;
    }

    setPrompt({
      installUrl: GOOGLE_PLAY_INSTALL_URL,
      store: "google-play",
    });
  }, [pathname, searchParams]);

  return prompt;
}

export function OpenInAsolHeaderPrompt({
  locale,
  prompt,
}: {
  locale: "ar" | "en";
  prompt: AsolInstallPrompt;
}) {
  const ar = locale === "ar";
  const appStore = prompt.store === "app-store";

  return (
    <aside id="sharing.open-in-asol-header-prompt.aside"
      data-asol-install-prompt
      className="flex h-[var(--asol-header-install-height)] w-full items-center justify-center gap-2 border-t border-primary/15 bg-primary/5 px-3 text-center"
      aria-label={ar ? "تثبيت تطبيق ASOL" : "Install the ASOL app"}
    >
      <Download id="sharing.open-in-asol-header-prompt.download" className="h-4 w-4 shrink-0 text-primary" aria-hidden />
      <div id="sharing.open-in-asol-header-prompt.div" className="min-w-0 text-xs leading-tight sm:flex sm:items-center sm:gap-2 sm:text-sm">
        <p id="sharing.open-in-asol-header-prompt.p" className="truncate font-bold text-on-surface">
          {ar
            ? "استمتع بالتجربة الكاملة على ASOL"
            : "Get the full ASOL experience"}
        </p>
        <a id="sharing.open-in-asol-header-prompt.a"
          href={prompt.installUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-0.5 inline-flex shrink-0 font-bold text-primary underline-offset-2 sm:mt-0"
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
    </aside>
  );
}
