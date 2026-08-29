"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { useSession } from "@/features/auth/ui";
import { isSuperAdmin } from "@/features/auth";
import { useAdminArabic } from "@/shared/i18n/use-admin-arabic";
import { RELEASE_CONSOLE_TABS } from "./tabs/tab-registry";
import { uiAttributes } from "@asol/ui-registry-core";

export function ReleaseConsolePage() {
  const { t, isRTL } = useAdminArabic();
  const { session, isLoading } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const allowed = !isLoading && isSuperAdmin(session);
  const tabs = RELEASE_CONSOLE_TABS.filter((tab) => tab.enabled({ isSuperAdmin: allowed }))
    .sort((left, right) => left.order - right.order);
  const requested = searchParams.get("tab") ?? "overview";
  const active = tabs.some((tab) => tab.id === requested) ? requested : "overview";
  const select = (id: string) => {
    const parameters = new URLSearchParams(searchParams.toString());
    parameters.set("tab", id);
    router.replace(`?${parameters.toString()}`, { scroll: false });
  };
  if (isLoading) return <main {...uiAttributes({ uid: "google-play-console.release-console-page.main.4-JdK1y1", id: "google-play-console.release-console-page.main.4" })} id="google-play-console.release-console-page.main" className="p-4 text-sm text-on-surface-variant">{t("releaseConsole.loading")}</main>;
  if (!allowed) return <main {...uiAttributes({ uid: "google-play-console.release-console-page.main.5-Jqao9L", id: "google-play-console.release-console-page.main.5" })} id="google-play-console.release-console-page.main.2" className="mx-auto max-w-2xl p-6" dir={isRTL ? "rtl" : "ltr"}>
    <div {...uiAttributes({ uid: "google-play-console.release-console-page.div.2-JJG3Lz", id: "google-play-console.release-console-page.div.2" })} id="google-play-console.release-console-page.div" className="rounded-md bg-error-container p-4 text-on-error-container">
      {t("releaseConsole.forbidden")}
    </div>
  </main>;
  return (
    <main {...uiAttributes({ uid: "google-play-console.release-console-page.main.6-LocAT3", id: "google-play-console.release-console-page.main.6" })} id="google-play-console.release-console-page.main.3" className="asol-release-console mx-auto w-full max-w-7xl space-y-4 p-4 pb-24"
      dir={isRTL ? "rtl" : "ltr"}>
      <header {...uiAttributes({ uid: "google-play-console.release-console-page.header.2-PlpCI7", id: "google-play-console.release-console-page.header.2" })} id="google-play-console.release-console-page.header"><h1 {...uiAttributes({ uid: "google-play-console.release-console-page.h1.2-o1Sl9J", id: "google-play-console.release-console-page.h1.2" })} id="google-play-console.release-console-page.h1" className="text-2xl font-semibold">{t("releaseConsole.title")}</h1>
        <p {...uiAttributes({ uid: "google-play-console.release-console-page.p.2-g0UQK5", id: "google-play-console.release-console-page.p.2" })} id="google-play-console.release-console-page.p" className="mt-1 text-sm text-on-surface-variant">{t("releaseConsole.subtitle")}</p></header>
      <Tabs value={active} onValueChange={select}>
        <TabsList id="google-play-console.release-console-page.tabs-list" className="flex h-auto w-full flex-wrap justify-start gap-1">
          {tabs.map((tab) => <TabsTrigger key={tab.id} ui={tab.ui} value={tab.id} className="gap-2">
            <tab.icon className="h-4 w-4" />{t(tab.labelKey)}</TabsTrigger>)}
        </TabsList>
        {tabs.map((tab) => <TabsContent key={tab.id} value={tab.id} className="mt-4">
          <tab.component />
        </TabsContent>)}
      </Tabs>
    </main>
  );
}
