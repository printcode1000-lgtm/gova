"use client";

// Client component: it renders `CloudAccountsFacts`, which the server derives.
// Never name an environment variable or read server state here.

import * as React from "react";
import { Cloud } from "lucide-react";

import { useSession } from "@/features/auth/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";

import { CLOUD_ACCOUNTS_COPY } from "./cloud-accounts-copy";
import type { CloudAccountsFacts } from "./cloud-accounts-facts.types";
import { CloudAccountsCloudflareTab } from "./CloudAccountsCloudflareTab";
import { CloudAccountsGeneralTab } from "./CloudAccountsGeneralTab";
import { Note, RichTextView } from "./CloudAccountsPrimitives";
import { CloudAccountsTursoTab } from "./CloudAccountsTursoTab";
import { CloudAccountsVercelTab } from "./CloudAccountsVercelTab";
import {
  useCloudAccountsLiveUsage,
  type CloudAccountsTab,
} from "./use-cloud-accounts-live-usage";

const tabTriggerClass =
  "min-h-11 px-3 py-2 text-sm active:bg-surface-container-high active:text-on-surface active:scale-[0.99]";

export function SuperAdminCloudAccountsContent({ facts }: { facts: CloudAccountsFacts }) {
  const { session } = useSession();
  const [activeTab, setActiveTab] = React.useState<CloudAccountsTab>("general");
  const live = useCloudAccountsLiveUsage(activeTab, session?.sessionToken);

  return (
    <main
      id="features-super-admin-presentation-superadmincloudaccountscontent-main-6-4uw4oe"
      className="mx-auto w-full max-w-5xl space-y-2 p-4 pb-24"
      dir="rtl"
    >
      <header
        id="features-super-admin-presentation-superadmincloudaccountscontent-header-7-qohfcl"
        className="flex flex-wrap items-center gap-3"
      >
        <Cloud
          id="features-super-admin-presentation-superadmincloudaccountscontent-cloud-8-czmiif"
          className="h-6 w-6 text-primary"
        />
        <div id="features-super-admin-presentation-superadmincloudaccountscontent-div-9-svt8j1">
          <h1
            id="features-super-admin-presentation-superadmincloudaccountscontent-heading-10-dc13q0"
            className="text-xl font-semibold text-on-surface sm:text-2xl"
          >
            {CLOUD_ACCOUNTS_COPY.title}
          </h1>
          <p
            id="features-super-admin-presentation-superadmincloudaccountscontent-text-11-o4dt5l"
            className="text-sm text-on-surface-variant"
          >
            <RichTextView parts={CLOUD_ACCOUNTS_COPY.summary(facts)} />
          </p>
        </div>
      </header>

      <Note
        id="features-super-admin-presentation-superadmincloudaccountscontent-note-15-idoggy"
        parts={CLOUD_ACCOUNTS_COPY.intro()}
      />

      <Tabs
        id="features-super-admin-presentation-superadmincloudaccountscontent-tabs-16-h4e5aq"
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as CloudAccountsTab)}
        dir="rtl"
        className="mt-5"
      >
        <TabsList
          id="features-super-admin-presentation-superadmincloudaccountscontent-tabslist-17-e1u8up"
          aria-label={CLOUD_ACCOUNTS_COPY.tabsLabel}
          className="flex w-full justify-start gap-1 overflow-x-auto rounded-lg border bg-surface p-1"
        >
          {(Object.keys(CLOUD_ACCOUNTS_COPY.tabs) as CloudAccountsTab[]).map((tab) => (
            <TabsTrigger key={tab} value={tab} className={tabTriggerClass}>
              {CLOUD_ACCOUNTS_COPY.tabs[tab]}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent
          id="features-super-admin-presentation-superadmincloudaccountscontent-tabscontent-22-general"
          value="general"
          className="mt-2"
        >
          <CloudAccountsGeneralTab facts={facts} />
        </TabsContent>
        <TabsContent
          id="features-super-admin-presentation-superadmincloudaccountscontent-tabscontent-23-vercel"
          value="vercel"
          className="mt-2"
        >
          <CloudAccountsVercelTab facts={facts} liveUsage={live.vercel} />
        </TabsContent>
        <TabsContent
          id="features-super-admin-presentation-superadmincloudaccountscontent-tabscontent-24-turso"
          value="turso"
          className="mt-2"
        >
          <CloudAccountsTursoTab facts={facts} liveUsage={live.turso} />
        </TabsContent>
        <TabsContent
          id="features-super-admin-presentation-superadmincloudaccountscontent-tabscontent-25-cloudflare"
          value="cloudflare"
          className="mt-2"
        >
          <CloudAccountsCloudflareTab
            facts={facts}
            liveUsage={live.r2Usage}
            liveContents={live.r2Contents}
          />
        </TabsContent>
      </Tabs>
    </main>
  );
}
