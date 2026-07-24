import type { Metadata } from "next";
import "./globals.css";
import { AppInitScript } from "@/lib/app-init";
import { THEME_COLOR_LIGHT } from "@/theme/runtime";
import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";

config.autoAddCss = false;

import { PreferencesProvider } from "@/lib/preferences";
import { ShellLayout } from "@/components/layouts/ShellLayout";
import { AppQueryProvider } from "@/core/providers/query-provider";
import { SessionProvider } from "@/features/auth/components/SessionProvider";
import { NetworkStatusProvider } from "@/features/network/hooks/use-network-status";
import { NetworkStatusBanner } from "@/components/network/NetworkStatusBanner";
import { OtaUpdateProvider } from "@/features/ota/hooks/use-ota-update";
import { OtaUpdatePrompt } from "@/components/ota/OtaUpdatePrompt";
import { MobileBackButtonController } from "@/components/navigation/MobileBackButtonController";
import { VoiceInputController } from "@/components/voice-input/VoiceInputController";
import { SystemLogCollector } from "@/features/system-logs/SystemLogCollector";
import { SystemLogErrorBoundary } from "@/features/system-logs/SystemLogErrorBoundary";
import { SnapshotProvider } from "@/features/page-snapshot";
import { FavoritesProvider } from "@/features/favorites";
import {
  AndroidPushController,
  WebPushController,
} from "@/features/notifications";
import dynamic from "next/dynamic";
import { Suspense } from "react";

import { isDevelopment, withBasePath } from "@/core/config";
import { InstallationBootstrap } from "@/lib/installation";

const DeveloperBadge = isDevelopment
  ? dynamic(() =>
      import("@/components/dev/DeveloperBadge").then((m) => m.DeveloperBadge),
    )
  : () => null;

export const metadata: Metadata = {
  title: "Asol",
  description: "Asol — تطبيق Next.js",
  icons: {
    icon: withBasePath("/logo.png"),
    apple: withBasePath("/logo.png"),
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      data-theme="light"
      data-theme-hydrated="false"
      data-app-hydrated="false"
      suppressHydrationWarning
    >
      <head>
        <meta name="theme-color" content={THEME_COLOR_LIGHT} />
        <AppInitScript />
      </head>
      <body className="antialiased">
        <InstallationBootstrap>
          <AppQueryProvider>
            <SessionProvider>
              <FavoritesProvider>
                <SystemLogCollector />
                <AndroidPushController />
                <WebPushController />
                <SystemLogErrorBoundary>
                  <PreferencesProvider>
                    <NetworkStatusProvider>
                      <OtaUpdateProvider>
                        <Suspense
                          fallback={<ShellLayout>{children}</ShellLayout>}
                        >
                          <SnapshotProvider>
                            <ShellLayout>{children}</ShellLayout>
                          </SnapshotProvider>
                        </Suspense>
                        <NetworkStatusBanner />
                        <OtaUpdatePrompt />
                        <MobileBackButtonController />
                        <VoiceInputController />
                        <DeveloperBadge />
                      </OtaUpdateProvider>
                    </NetworkStatusProvider>
                  </PreferencesProvider>
                </SystemLogErrorBoundary>
              </FavoritesProvider>
            </SessionProvider>
          </AppQueryProvider>
        </InstallationBootstrap>
      </body>
    </html>
  );
}
