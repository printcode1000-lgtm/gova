import type * as React from "react";

import { CLOUD_ACCOUNTS_COPY } from "./cloud-accounts-copy";
import { cloudAccountsBridgeDiagram } from "./cloud-accounts-bridge-diagram";
import type {
  CloudAccountsFacts,
  LiveVercelUsageRow,
  VercelAccountFacts,
} from "./cloud-accounts-facts.types";
import {
  formatDateTime,
  formatInteger,
  joinParts,
  orUnavailable,
  vercelAvailableApiBillingParts,
  vercelAvailableUsageMetrics,
  vercelUsageUrl,
} from "./cloud-accounts-format";
import { CloudAccountRoutesSection } from "./CloudAccountRoutesSection";
import { FactTable, Note, RichTextView, SectionTitle, SubTitle } from "./CloudAccountsPrimitives";

const copy = CLOUD_ACCOUNTS_COPY.vercel;

function UsageMetrics({ account }: { account: VercelAccountFacts }) {
  const metrics = vercelAvailableUsageMetrics(account);
  if (metrics.length === 0) return <>{copy.noUsageMetrics}</>;
  return (
    <ul className="space-y-1">
      {metrics.map((metric) => (
        <li key={metric.slug}>
          <a
            href={vercelUsageUrl(account, metric.slug) ?? undefined}
            className="text-primary underline-offset-4 active:text-primary/70"
          >
            {metric.label}
          </a>{" "}
          <strong>
            {metric.usedDisplay} / {metric.limitDisplay}
          </strong>
        </li>
      ))}
    </ul>
  );
}

/** The live reading when it succeeded, otherwise the committed snapshot. */
function withLiveUsage(account: VercelAccountFacts, live: LiveVercelUsageRow | undefined) {
  return live?.status === "ok" ? { ...account, usage: live } : account;
}

function capturedAt(account: VercelAccountFacts, live: LiveVercelUsageRow | undefined): string {
  const captured = formatDateTime(account.usage.capturedAt);
  if (!live || live.status === "ok") return captured;
  return joinParts([captured, copy.liveFailed(orUnavailable(live.message))]);
}

/** The declared login, plus Vercel's own answer when it disagrees. */
function ownerCell(account: VercelAccountFacts): string {
  const owner = account.usage.ownerEmail;
  if (!owner || owner === account.email) return account.email;
  return joinParts([account.email, copy.emailMismatch(owner)]);
}

/** One account's cells; `metrics` is rendered by the caller's row map. */
function accountCells(
  boundary: CloudAccountsFacts["govaBoundary"],
  account: VercelAccountFacts,
  live: LiveVercelUsageRow | undefined,
  metrics: React.ReactNode,
) {
  const apiBillingParts = vercelAvailableApiBillingParts(account);
  return [
    { key: "label", content: orUnavailable(account.usage.teamSlug), ltr: true },
    { key: "project", content: account.project, ltr: true },
    { key: "email", content: ownerCell(account), ltr: true },
    { key: "serves", content: <RichTextView parts={copy.serves(account, boundary)} /> },
    { key: "env", content: formatInteger(account.declaredEnvCount) },
    { key: "git", content: <RichTextView parts={copy.git(account)} /> },
    { key: "deploy", content: account.deployCommand ?? copy.deployCommandMissing, ltr: true },
    { key: "metrics", content: metrics, ltr: true },
    {
      key: "api",
      content: apiBillingParts.length > 0 ? joinParts(apiBillingParts) : copy.noApiReadings,
      ltr: true,
    },
    { key: "captured", content: capturedAt(account, live) },
  ];
}

export function CloudAccountsVercelTab({
  facts,
  liveUsage,
}: {
  facts: CloudAccountsFacts;
  liveUsage: Readonly<Record<string, LiveVercelUsageRow>>;
}) {
  return (
    <>
      <SectionTitle id="features-super-admin-presentation-cloudaccountsverceltab-sectiontitle-accounts-yselqa">
        {copy.title(facts)}
      </SectionTitle>
      <FactTable
        id="features-super-admin-presentation-cloudaccountsverceltab-facttable-accounts-2ojusb"
        headers={copy.headers}
        rows={facts.vercel.map((snapshot) => {
          const live = liveUsage[snapshot.name];
          const account = withLiveUsage(snapshot, live);
          return {
            key: account.name,
            cells: accountCells(facts.govaBoundary, account, live, <UsageMetrics account={account} />),
          };
        })}
      />
      <Note
        id="features-super-admin-presentation-cloudaccountsverceltab-note-snapshot-dxes2p"
        parts={copy.snapshotNote(facts)}
      />

      <SubTitle id="features-super-admin-presentation-cloudaccountsverceltab-subtitle-routes-gmrniv">
        {copy.routesTitle}
      </SubTitle>
      <Note
        id="features-super-admin-presentation-cloudaccountsverceltab-note-routes-dqrsnu"
        parts={copy.routesNote(facts)}
      />
      <CloudAccountRoutesSection
        id="features-super-admin-presentation-cloudaccountsverceltab-routes-cwdwa3"
        groups={facts.routeGroups}
        boundary={facts.govaBoundary}
      />

      <SubTitle id="features-super-admin-presentation-cloudaccountsverceltab-subtitle-rule-fxatnj">
        {copy.ruleTitle}
      </SubTitle>
      <Note
        id="features-super-admin-presentation-cloudaccountsverceltab-note-rule-uypkou"
        parts={copy.rule(facts)}
      />
      <pre
        id="features-super-admin-presentation-cloudaccountsverceltab-pre-diagram-9eqvs9"
        className="mt-3 overflow-x-auto rounded-lg border bg-surface p-3 text-[10px] leading-5 sm:p-4 sm:text-xs sm:leading-6"
        dir="ltr"
      >
        {cloudAccountsBridgeDiagram(facts)}
      </pre>
      <Note
        id="features-super-admin-presentation-cloudaccountsverceltab-note-deployment-dirbst"
        parts={copy.deploymentNote(facts)}
      />
    </>
  );
}
