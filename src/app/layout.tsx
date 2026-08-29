import type { Metadata, Viewport } from "next";
import { BRANDING_WEB_BROWSER_ICON_PATH } from "@asol/branding-core";
import "./globals.css";
import { AppInitScript } from "@/shared/app-init";
import { THEME_COLOR_LIGHT } from "@/shared/theme/runtime";
import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";
import { uiAttributes } from "@asol/ui-registry-core";

config.autoAddCss = false;

import { PreferencesProvider } from "@/shared/preferences";
import { ShellLayout } from "@/shared/layouts/ShellLayout";
import { SafeAreaController } from "@/shared/layouts/SafeAreaController";
import { AppQueryProvider } from "@/core/providers/query-provider";
import { NotificationsFeatureBridge } from "@/core/composition/NotificationsFeatureBridge";
import { SessionProvider } from "@/features/auth/ui";
import { AuthLoginBootstrapController } from "@/features/auth/ui";
import { LoginSuccessToast } from "@/features/auth/ui";
import { NetworkStatusProvider } from "@/features/network/ui";
import { NetworkStatusBanner } from "@/features/network/ui";
import { OtaUpdateProvider } from "@asol/ota-core";
import { MobileBackButtonController } from "@/features/navigation/ui";
import { VoiceInputController } from "@/features/voice-input/ui";
import { SystemLogCollector } from "@/features/system-logs/ui";
import { SystemLogErrorBoundary } from "@/features/system-logs/ui";
import { SuperAdminErrorFloatingButton } from "@/features/system-logs/ui";
import { SuperAdminImpersonationBanner } from "@/features/super-admin/ui";
import { SuperAdminUiAttributeInspector } from "@/features/super-admin/ui";
import { SnapshotProvider } from "@/features/page-snapshot";
import { FavoritesProvider } from "@/features/favorites";
import { FeatureFlagController } from "@/features/feature-flags";
import { SpecialtyChatNotificationsController } from "@/features/specialty-chat";
import { OrderNotificationsController } from "@/features/orders/ui";
import dynamic from "next/dynamic";
import { Suspense } from "react";

import { isDevelopment } from "@/core/config";
import { withBasePath } from "@/core/config/public-env";
import { InstallationBootstrap } from "@/shared/installation";
import { PreAuthFailureMonitor } from "@/features/system-logs/ui";
import {
  PUBLIC_SHARE_ORIGIN,
  ShareDeepLinkController,
} from "@/features/sharing";

const DeveloperBadge = isDevelopment
  ? dynamic(() =>
      import("@/features/dev-tools/ui").then((m) => m.DeveloperBadge),
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
    <html {...uiAttributes({ uid: "layout.html-U8WxJi", id: "layout.html" })}
      lang="ar"
      dir="rtl"
      data-theme="light"
      data-theme-hydrated="false"
      data-app-hydrated="false"
      suppressHydrationWarning
    >
      <head {...uiAttributes({ uid: "layout.head-SUGA0E", id: "layout.head" })}>
        <meta {...uiAttributes({ uid: "layout.meta-9Z4EYk", id: "layout.meta" })} name="theme-color" content={THEME_COLOR_LIGHT} />
        <AppInitScript />
      </head>
      <body {...uiAttributes({ uid: "layout.body-OK126N", id: "layout.body" })} className="antialiased">
        <PreAuthFailureMonitor />
        <InstallationBootstrap>
          <AppQueryProvider>
            <SessionProvider>
              <PreferencesProvider>
                <NotificationsFeatureBridge>
                  <AuthLoginBootstrapController />
                  <FavoritesProvider>
                    <SystemLogCollector />
                    <FeatureFlagController />
                    <SpecialtyChatNotificationsController />
                    <OrderNotificationsController />
                    <SystemLogErrorBoundary>
                      <NetworkStatusProvider>
                        <OtaUpdateProvider>
                          <SafeAreaController />
                          <Suspense
                            fallback={<ShellLayout id="layout.shell-layout">{children}</ShellLayout>}
                          >
                            <SnapshotProvider>
                              <ShellLayout id="layout.shell-layout.2">{children}</ShellLayout>
                            </SnapshotProvider>
                          </Suspense>
                          <NetworkStatusBanner />
                          <LoginSuccessToast />
                          <MobileBackButtonController />
                          <ShareDeepLinkController />
                          <VoiceInputController />
                          <SuperAdminImpersonationBanner />
                          <SuperAdminUiAttributeInspector />
                          <SuperAdminErrorFloatingButton />
                          <DeveloperBadge />
                        </OtaUpdateProvider>
                      </NetworkStatusProvider>
                    </SystemLogErrorBoundary>
                  </FavoritesProvider>
                </NotificationsFeatureBridge>
              </PreferencesProvider>
            </SessionProvider>
          </AppQueryProvider>
        </InstallationBootstrap>
      </body>
    </html>
  );
}
