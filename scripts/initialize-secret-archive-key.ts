import { initializeArchiveKeyPair } from "./secret-archive-crypto";

initializeArchiveKeyPair().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
