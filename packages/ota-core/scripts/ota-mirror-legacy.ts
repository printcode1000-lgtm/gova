#!/usr/bin/env tsx
import { mirrorLegacyOtaManifest } from "../src/publishing";

async function main(): Promise<void> {
  const remove = process.argv.slice(2).includes("--remove");
  await mirrorLegacyOtaManifest(remove);
}

main().catch((error) => {
  console.error("❌ Mirror legacy failed:", error);
  process.exit(1);
});
