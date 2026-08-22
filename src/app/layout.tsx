import type { Metadata, Viewport } from "next";
import { BRANDING_WEB_BROWSER_ICON_PATH } from "@asol/branding-core";
import "./globals.css";
import { AppInitScript } from "@/lib/app-init";
import { THEME_COLOR_LIGHT } from "@/theme/runtime";
import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";

config.autoAddCss = false;

import { PreferencesProvider } from "@/lib/preferences";
import { ShellLayout } from "@/components/layouts/ShellLayout";
import { SafeAreaController } from "@/components/layouts/SafeAreaController";
import { AppQueryProvider } from "@/core/providers/query-provider";
import { SessionProvider } from "@/features/auth/components/SessionProvider";
import { AuthLoginBootstrapController } from "@/features/auth/components/AuthLoginBootstrapController";
import { LoginSuccessToast } from "@/features/auth/components/LoginSuccessToast";
import { NetworkStatusProvider } from "@/features/network/hooks/use-network-status";
import { NetworkStatusBanner } from "@/features/network/presentation/NetworkStatusBanner";
import { OtaUpdateProvider } from "@asol/ota-core";
import { MobileBackButtonController } from "@/features/navigation/presentation/MobileBackButtonController";
import { VoiceInputController } from "@/features/voice-input/presentation/VoiceInputController";
import { SystemLogCollector } from "@/features/system-logs/SystemLogCollector";
import { SystemLogErrorBoundary } from "@/features/system-logs/SystemLogErrorBoundary";
import { SuperAdminErrorFloatingButton } from "@/features/system-logs/SuperAdminErrorFloatingButton";
import { SuperAdminImpersonationBanner } from "@/features/super-admin/components/SuperAdminImpersonationBanner";
import { SnapshotProvider } from "@/features/page-snapshot";
import { FavoritesProvider } from "@/features/favorites";
import { FeatureFlagController } from "@/features/feature-flags";
import {
  NativePushController,
  NotificationOptInController,
  WebPushController,
} from "@/features/notifications/ui";
import { SpecialtyChatNotificationsController } from "@/features/specialty-chat";
import { OrderNotificationsController } from "@/features/orders/presentation/OrderNotificationsController";
import dynamic from "next/dynamic";
import { Suspense } from "react";

import { isDevelopment } from "@/core/config";
import { withBasePath } from "@/core/config/public-env";
import { InstallationBootstrap } from "@/lib/installation";
import { PreAuthFailureMonitor } from "@/features/system-logs/PreAuthFailureMonitor";
import {
  PUBLIC_SHARE_ORIGIN,
  ShareDeepLinkController,
} from "@/features/sharing";

const DeveloperBadge = isDevelopment
  ? dynamic(() =>
      import("@/features/dev-tools/presentation/DeveloperBadge").then((m) => m.DeveloperBadge),
    )
  : () => null;

export const metadata: Metadata = {
  metadataBase: new URL(PUBLIC_SHARE_ORIGIN),
  title: "Asol",
  description: "Asol — تطبيق Next.js",
  icons: {
    icon: withBasePath(BRANDING_WEB_BROWSER_ICON_PATH),
    apple: withBasePath(BRANDING_WEB_BROWSER_ICON_PATH),
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
        <PreAuthFailureMonitor />
        <InstallationBootstrap>
          <AppQueryProvider>
            <SessionProvider>
              <AuthLoginBootstrapController />
              <FavoritesProvider>
                <PreferencesProvider>
                  <SystemLogCollector />
                  <FeatureFlagController />
                  <NativePushController />
                  <WebPushController />
                  <NotificationOptInController />
                  <SpecialtyChatNotificationsController />
                  <OrderNotificationsController />
                  <SystemLogErrorBoundary>
                    <NetworkStatusProvider>
                      <OtaUpdateProvider>
                        {/* Owns the system insets for every route, shell or not. */}
                        <SafeAreaController />
                        <Suspense
                          fallback={<ShellLayout>{children}</ShellLayout>}
                        >
                          <SnapshotProvider>
                            <ShellLayout>{children}</ShellLayout>
                          </SnapshotProvider>
                        </Suspense>
                        <NetworkStatusBanner />
                        <LoginSuccessToast />
                        <MobileBackButtonController />
                        <ShareDeepLinkController />
                        <VoiceInputController />
                        <SuperAdminImpersonationBanner />
                        <SuperAdminErrorFloatingButton />
                        <DeveloperBadge />
                      </OtaUpdateProvider>
                    </NetworkStatusProvider>
                  </SystemLogErrorBoundary>
                </PreferencesProvider>
              </FavoritesProvider>
            </SessionProvider>
          </AppQueryProvider>
        </InstallationBootstrap>
      </body>
    </html>
  );
}
