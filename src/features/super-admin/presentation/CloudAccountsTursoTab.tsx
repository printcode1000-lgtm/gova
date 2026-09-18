import { CLOUD_ACCOUNTS_COPY } from "./cloud-accounts-copy";
import type {
  CloudAccountsFacts,
  LiveTursoUsageRow,
  TursoAccountFacts,
  TursoCloudAccountUsage,
} from "./cloud-accounts-facts.types";
import {
  formatBytes,
  formatDateTime,
  formatInteger,
  joinList,
  joinParts,
  orNone,
  orUnavailable,
  usageLine,
} from "./cloud-accounts-format";
import { FactTable, Note, SectionTitle, SubTitle } from "./CloudAccountsPrimitives";

const copy = CLOUD_ACCOUNTS_COPY.turso;

/** The live reading when it succeeded, otherwise the committed snapshot. */
function usageOf(account: TursoAccountFacts, live: LiveTursoUsageRow | undefined): TursoCloudAccountUsage {
  return live?.status === "ok" ? live : account.usage;
}

function details(usage: TursoCloudAccountUsage, live: LiveTursoUsageRow | undefined): string {
  const parts = [
    copy.locations(formatInteger(usage.locations)),
    copy.groups(formatInteger(usage.groups)),
    copy.plan(orUnavailable(usage.plan)),
    copy.input(formatBytes(usage.inputBytes)),
    copy.output(formatBytes(usage.outputBytes)),
    formatDateTime(usage.capturedAt),
  ];
  if (live && live.status !== "ok") parts.push(copy.liveFailed(orUnavailable(live.message)));
  else if (usage.status !== "ok" && usage.message) parts.push(usage.message);
  return joinParts(parts);
}

function accountRow(account: TursoAccountFacts, live: LiveTursoUsageRow | undefined) {
  const usage = usageOf(account, live);
  return {
    key: account.organizationEnv,
    cells: [
      { key: "organization", content: account.organization, ltr: true },
      { key: "env", content: account.organizationEnv, ltr: true },
      { key: "owner", content: orUnavailable(usage.ownerEmail), ltr: true },
      { key: "databases", content: formatInteger(usage.databases) },
      { key: "configured", content: joinList(account.databases.map((d) => d.cloudName)), ltr: true },
      { key: "cloud", content: orNone(usage.cloudDatabaseNames.length ? joinList(usage.cloudDatabaseNames) : null), ltr: true },
      { key: "readers", content: joinList(account.readers), ltr: true },
      { key: "read", content: usageLine(usage.rowsRead, usage.rowsReadLimit), ltr: true },
      { key: "write", content: usageLine(usage.rowsWritten, usage.rowsWrittenLimit), ltr: true },
      { key: "storage", content: usageLine(usage.storageBytes, usage.storageBytesLimit, formatBytes), ltr: true },
      { key: "sync", content: usageLine(usage.bytesSynced, usage.bytesSyncedLimit, formatBytes), ltr: true },
      { key: "details", content: details(usage, live) },
    ],
  };
}

function presence(cloudName: string, usage: TursoCloudAccountUsage): string {
  if (usage.cloudDatabaseNames.length === 0) return copy.cloudUnknown;
  return usage.cloudDatabaseNames.includes(cloudName) ? copy.presentInCloud : copy.missingFromCloud;
}

function databaseRows(account: TursoAccountFacts, usage: TursoCloudAccountUsage) {
  return account.databases.map((database) => ({
    key: database.label,
    cells: [
      { key: "label", content: database.label, ltr: true },
      { key: "cloud", content: database.cloudName, ltr: true },
      { key: "present", content: presence(database.cloudName, usage) },
      { key: "count", content: formatInteger(database.tables.length) },
      { key: "tables", content: joinList(database.tables), ltr: true },
      { key: "readers", content: joinList(database.readers), ltr: true },
    ],
  }));
}

export function CloudAccountsTursoTab({
  facts,
  liveUsage,
}: {
  facts: CloudAccountsFacts;
  liveUsage: Readonly<Record<string, LiveTursoUsageRow>>;
}) {
  return (
    <>
      <SectionTitle id="features-super-admin-presentation-cloudaccountstursotab-sectiontitle-accounts-rgkcfk">
        {copy.title(facts)}
      </SectionTitle>
      <FactTable
        id="features-super-admin-presentation-cloudaccountstursotab-facttable-accounts-qi3uu7"
        headers={copy.headers}
        rows={facts.turso.map((account) => accountRow(account, liveUsage[account.organization]))}
      />
      <Note
        id="features-super-admin-presentation-cloudaccountstursotab-note-live-jx8k7w"
        parts={copy.note(facts)}
      />
      <Note
        id="features-super-admin-presentation-cloudaccountstursotab-note-readers-qa15kh"
        parts={copy.readersNote()}
      />
      {facts.tursoUnassigned.length > 0 ? (
        <Note
          id="features-super-admin-presentation-cloudaccountstursotab-note-unassigned-u7n2qa"
          parts={copy.unassigned(facts)}
        />
      ) : null}

      {facts.turso.map((account) => (
        <section key={account.organizationEnv}>
          <SubTitle>{copy.accountTitle(account)}</SubTitle>
          <FactTable
            headers={copy.databaseHeaders}
            rows={databaseRows(account, usageOf(account, liveUsage[account.organization]))}
          />
        </section>
      ))}
    </>
  );
}
