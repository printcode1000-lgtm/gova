#!/usr/bin/env tsx
import { publishOtaRelease } from "../src/publishing";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const confirmUpload = args.includes("--confirm-upload");
  const mandatory = args.includes("--mandatory");

  const notesArg = args.find((a) => a.startsWith("--notes="));
  const notes = notesArg ? notesArg.slice("--notes=".length) : undefined;

  const minNativeArg = args.find((a) => a.startsWith("--minimum-native-version="));
  const minimumNativeVersion = minNativeArg ? minNativeArg.slice("--minimum-native-version=".length).trim() : undefined;

  const result = await publishOtaRelease({
    dryRun,
    confirmUpload,
    mandatory,
    notes,
    minimumNativeVersion,
  });

  if (!result.ok) {
    console.error(`❌ OTA publish failed: ${result.error.message}`);
    process.exit(1);
  }

  if (dryRun) {
    console.log("✅ Dry run: the compatibility gate passed.");
  } else {
    console.log(`✅ OTA release ${result.value.version} published successfully!`);
    console.log(`Manifest URL: ${result.value.manifestUrl}`);
    console.log(`Release ID: ${result.value.releaseId}`);
    console.log(`Total files: ${result.value.fileCount}, size: ${Math.ceil(result.value.totalBytes / 1024)} KB`);
  }
}

main().catch((error) => {
  console.error("❌ Unexpected ota-publish error:", error);
  process.exit(1);
});
