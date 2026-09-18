import { CLOUD_ACCOUNTS_COPY } from "./cloud-accounts-copy";
import type { CloudAccountsFacts } from "./cloud-accounts-facts.types";
import { FactTable, Note, SectionTitle } from "./CloudAccountsPrimitives";

const copy = CLOUD_ACCOUNTS_COPY.general;
const providers = CLOUD_ACCOUNTS_COPY.providers;

export function CloudAccountsGeneralTab({ facts }: { facts: CloudAccountsFacts }) {
  const rows = [
    { key: "vercel", provider: providers.vercel, accounts: facts.vercel.length, holds: copy.vercelHolds(facts) },
    { key: "turso", provider: providers.turso, accounts: facts.turso.length, holds: copy.tursoHolds(facts) },
    { key: "r2", provider: providers.r2, accounts: facts.r2.length, holds: copy.r2Holds(facts) },
  ].map((row) => ({
    key: row.key,
    cells: [
      { key: "provider", content: row.provider, ltr: true },
      { key: "accounts", content: row.accounts },
      { key: "holds", content: row.holds },
    ],
  }));

  return (
    <>
      <SectionTitle id="features-super-admin-presentation-cloudaccountsgeneraltab-sectiontitle-overview-hceotx">
        {copy.overviewTitle}
      </SectionTitle>
      <FactTable
        id="features-super-admin-presentation-cloudaccountsgeneraltab-facttable-overview-0xr324"
        headers={copy.overviewHeaders}
        rows={rows}
      />
      <Note
        id="features-super-admin-presentation-cloudaccountsgeneraltab-note-topology-h3ixbc"
        parts={copy.topology(facts)}
      />

      <SectionTitle id="features-super-admin-presentation-cloudaccountsgeneraltab-sectiontitle-credentials-ajqlzx">
        {copy.credentialsTitle}
      </SectionTitle>
      <Note
        id="features-super-admin-presentation-cloudaccountsgeneraltab-note-credentials-store-ex3vdr"
        parts={copy.credentialsStore(facts)}
      />
      <Note
        id="features-super-admin-presentation-cloudaccountsgeneraltab-note-credentials-sync-zhwszj"
        parts={copy.credentialsSync(facts)}
      />
    </>
  );
}
