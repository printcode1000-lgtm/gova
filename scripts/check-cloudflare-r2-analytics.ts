import { readEnvFiles } from "@asol/env-core/files";

import { listCloudflareAccounts, runCloudflareControl } from "./cloudflare-control";

async function main(): Promise<void> {
  const env = readEnvFiles();
  const rows: unknown[] = [];

  for (const account of listCloudflareAccounts()) {
    const output = await runCloudflareControl(
      ["r2:analytics:verify", "--account", account.id, "--json"],
      env,
    );
    rows.push(JSON.parse(output) as unknown);
  }

  console.log(JSON.stringify(rows, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
