"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "@/features/auth/components/SessionProvider";
import { isSuperAdmin } from "@/features/auth/utils/super-admin";
import { useTranslation } from "@/lib/i18n";
import { RELEASE_CONSOLE_TABS } from "./tabs/tab-registry";

export function ReleaseConsolePage() {
  const { t, isRTL } = useTranslation();
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
  if (isLoading) return <main className="p-4 text-sm text-on-surface-variant">{t("releaseConsole.loading")}</main>;
  if (!allowed) return <main className="mx-auto max-w-2xl p-6" dir={isRTL ? "rtl" : "ltr"}>
    <div className="rounded-md bg-error-container p-4 text-on-error-container">
      {t("releaseConsole.forbidden")}
    </div>
  </main>;
  return (
    <main className="asol-release-console mx-auto w-full max-w-7xl space-y-4 p-4 pb-24"
      dir={isRTL ? "rtl" : "ltr"}>
      <header><h1 className="text-2xl font-semibold">{t("releaseConsole.title")}</h1>
        <p className="mt-1 text-sm text-on-surface-variant">{t("releaseConsole.subtitle")}</p></header>
      <Tabs value={active} onValueChange={select}>
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
          {tabs.map((tab) => <TabsTrigger key={tab.id} value={tab.id} className="gap-2">
            <tab.icon className="h-4 w-4" />{t(tab.labelKey)}</TabsTrigger>)}
        </TabsList>
        {tabs.map((tab) => <TabsContent key={tab.id} value={tab.id} className="mt-4">
          <tab.component />
        </TabsContent>)}
      </Tabs>
    </main>
  );
}
