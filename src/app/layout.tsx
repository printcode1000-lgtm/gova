import type { Metadata } from "next";
import "./globals.css";
import { AppInitScript } from "@/lib/app-init";
import { THEME_COLOR_LIGHT } from "@/theme/runtime";

import { PreferencesProvider } from "@/lib/preferences";
import { ShellLayout } from "@/components/layouts/ShellLayout";
import dynamic from "next/dynamic";

const DeveloperBadge = process.env.NODE_ENV === "development"
  ? dynamic(() => import("@/components/dev/DeveloperBadge").then((m) => m.DeveloperBadge))
  : () => null;

export const metadata: Metadata = {
  title: "Gova",
  description: "Gova — تطبيق Next.js",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
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
        <PreferencesProvider>
          <ShellLayout>{children}</ShellLayout>
          <DeveloperBadge />
        </PreferencesProvider>
      </body>
    </html>
  );
}
