import { CLOUD_ACCOUNTS_COPY } from "./cloud-accounts-copy";
import type {
  CloudAccountsFacts,
  LiveR2ContentsRow,
  LiveR2UsageRow,
  R2AccountFacts,
} from "./cloud-accounts-facts.types";
import {
  abbreviateAccountId,
  formatBytes,
  formatDateTime,
  formatInteger,
  joinParts,
  orNone,
  orUnavailable,
  publicHost,
  usageLineOrLimit,
} from "./cloud-accounts-format";
import { FactTable, Note, SectionTitle, SubTitle } from "./CloudAccountsPrimitives";

const copy = CLOUD_ACCOUNTS_COPY.cloudflare;

const ACCOUNT_FIELDS: readonly {
  readonly key: keyof typeof copy.rows;
  readonly value: (account: R2AccountFacts) => string;
}[] = [
  { key: "env", value: (account) => copy.envPattern(account.envPrefix) },
  { key: "account", value: (account) => abbreviateAccountId(account.accountId) },
  { key: "email", value: (account) => account.email },
  { key: "bucket", value: (account) => account.bucketName },
  { key: "target", value: (account) => orNone(account.target) },
  { key: "publicUrl", value: (account) => publicHost(account.publicUrl) },
];

/** Live contents when the listing succeeded, otherwise the committed snapshot. */
function withLiveContents(account: R2AccountFacts, live: LiveR2ContentsRow | undefined): R2AccountFacts {
  return live?.status === "ok" ? { ...account, contents: live } : account;
}

function UsageList({
  account,
  live,
  liveContents,
}: {
  account: R2AccountFacts;
  live: LiveR2UsageRow | undefined;
  liveContents: LiveR2ContentsRow | undefined;
}) {
  const usage = live?.status === "ok" ? live : account.usage;
  const items = [
    { key: "a", label: copy.classA, value: usageLineOrLimit(usage.classAOperations, usage.classAOperationsLimit) },
    { key: "b", label: copy.classB, value: usageLineOrLimit(usage.classBOperations, usage.classBOperationsLimit) },
    {
      key: "storage",
      label: copy.totalStorage,
      value: usageLineOrLimit(usage.storageBytes, usage.storageBytesLimit, formatBytes),
    },
    { key: "objects", label: copy.currentObjects, value: formatInteger(account.contents.objectCount) },
    { key: "size", label: copy.currentSize, value: formatBytes(account.contents.totalSizeBytes) },
    { key: "latest", label: copy.latestObject, value: orNone(account.contents.latestObjectKey) },
  ];
  const notices = [
    ...(live && live.status !== "ok" ? [copy.liveFailed(orUnavailable(live.message))] : []),
    ...(liveContents && liveContents.status !== "ok"
      ? [copy.liveContentsFailed(orUnavailable(liveContents.message))]
      : []),
    ...(account.contents.status !== "ok" ? [orUnavailable(account.contents.message)] : []),
  ];
  return (
    <>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.key}>
            {item.label} <strong>{item.value}</strong>
          </li>
        ))}
      </ul>
      {notices.map((notice) => (
        <span key={notice} className="mt-1 block text-on-surface-variant">
          {notice}
        </span>
      ))}
    </>
  );
}

export function CloudAccountsCloudflareTab({
  facts,
  liveUsage,
  liveContents,
}: {
  facts: CloudAccountsFacts;
  liveUsage: Readonly<Record<string, LiveR2UsageRow>>;
  liveContents: Readonly<Record<string, LiveR2ContentsRow>>;
}) {
  const accountRows = ACCOUNT_FIELDS.map((field) => ({
    key: field.key,
    cells: [
      { key: "label", content: copy.rows[field.key] },
      ...facts.r2.map((account) => ({ key: account.id, content: field.value(account), ltr: true })),
    ],
  }));

  const destinationRows = facts.storageDestinations.map((destination) => ({
    key: destination.source,
    cells: [
      { key: "source", content: destination.source, ltr: true },
      { key: "account", content: destination.r2AccountId, ltr: true },
      { key: "folder", content: destination.folder, ltr: true },
    ],
  }));

  const contentRows = facts.r2.map((snapshot) => {
    const account = withLiveContents(snapshot, liveContents[snapshot.id]);
    const live = liveUsage[account.id];
    const usage = live?.status === "ok" ? live : account.usage;
    return {
      key: account.id,
      cells: [
        { key: "bucket", content: `${account.bucketName} (${account.id})`, ltr: true },
        { key: "usage", content: <UsageList account={account} live={live} liveContents={liveContents[account.id]} />, ltr: true },
        {
          key: "updated",
          content: joinParts([
            `${copy.analytics} ${formatDateTime(usage.capturedAt)}`,
            `${copy.contents} ${formatDateTime(account.contents.capturedAt)}`,
          ]),
        },
      ],
    };
  });

  return (
    <>
      <SectionTitle id="features-super-admin-presentation-cloudaccountscloudflaretab-sectiontitle-accounts-cq4msi">
        {copy.title(facts)}
      </SectionTitle>
      <FactTable
        id="features-super-admin-presentation-cloudaccountscloudflaretab-facttable-accounts-osl6pu"
        headers={["", ...facts.r2.map((account) => account.id)]}
        rows={accountRows}
      />

      <SubTitle id="features-super-admin-presentation-cloudaccountscloudflaretab-subtitle-destinations-jwedtp">
        {copy.destinationsTitle}
      </SubTitle>
      <Note
        id="features-super-admin-presentation-cloudaccountscloudflaretab-note-destinations-xhhuha"
        parts={copy.destinationsNote(facts)}
      />
      <FactTable
        id="features-super-admin-presentation-cloudaccountscloudflaretab-facttable-destinations-2zsimo"
        headers={copy.destinationHeaders}
        rows={destinationRows}
      />

      <SubTitle id="features-super-admin-presentation-cloudaccountscloudflaretab-subtitle-contents-lcadea">
        {copy.contentsTitle}
      </SubTitle>
      <FactTable
        id="features-super-admin-presentation-cloudaccountscloudflaretab-facttable-contents-ii7m6m"
        headers={copy.contentsHeaders}
        rows={contentRows}
      />
      <Note
        id="features-super-admin-presentation-cloudaccountscloudflaretab-note-refresh-gc9mkw"
        parts={copy.note(facts)}
      />
    </>
  );
}
