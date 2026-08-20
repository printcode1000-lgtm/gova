import { initializeArchiveKeyPair } from "@asol/secrets-core";

initializeArchiveKeyPair().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
