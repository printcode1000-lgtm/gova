import type { Metadata } from "next";
import "./globals.css";
import { AppInitScript } from "@/lib/app-init";
import { THEME_COLOR_LIGHT } from "@/theme/runtime";

import { PreferencesProvider } from "@/lib/preferences";
import { ShellLayout } from "@/components/layouts/ShellLayout";
import { AppQueryProvider } from "@/core/providers/query-provider";
import dynamic from "next/dynamic";

import { isDevelopment, withBasePath } from "@/core/config";

const DeveloperBadge = isDevelopment
  ? dynamic(() => import("@/components/dev/DeveloperBadge").then((m) => m.DeveloperBadge))
  : () => null;

export const metadata: Metadata = {
  title: "Gova",
  description: "Gova — تطبيق Next.js",
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
    <html lang="ar" dir="rtl" data-theme="light" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content={THEME_COLOR_LIGHT} />
        <AppInitScript />
      </head>
      <body className="antialiased">
        <AppQueryProvider>
          <PreferencesProvider>
            <ShellLayout>{children}</ShellLayout>
            <DeveloperBadge />
          </PreferencesProvider>
        </AppQueryProvider>
      </body>
    </html>
  );
}

