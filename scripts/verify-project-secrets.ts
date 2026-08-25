import { SECRET_ARCHIVE_PASSWORD_ENV_VAR } from "@asol/secrets-core";
import {
  assertReportContainsNoValues,
  buildSecretPresenceReport,
} from "./secret-presence-status";

function main(): void {
  const rows = buildSecretPresenceReport();
  assertReportContainsNoValues(rows, process.env);
  console.log(
    `ASOL secrets:verify — names and paths only; values are never printed. Non-interactive restore uses ${SECRET_ARCHIVE_PASSWORD_ENV_VAR}.`,
  );
  for (const row of rows) {
    if (row.kind === "env") {
      console.log(`env ${row.name} ${row.status}`);
      continue;
    }
    console.log(`file ${row.path} ${row.status}`);
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
