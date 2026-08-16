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

    // `OtaCoreError.internal("OTA publish failed", error)` keeps the real cause in
    // `details` and the top-level message says nothing on its own. Printing only the
    // message left a CI failure reading "OTA publish failed: OTA publish failed" with no
    // way to tell what actually broke — the failure has to explain itself, especially on
    // a machine nobody can attach a debugger to.
    const details = (result.error as { details?: unknown }).details;
    if (details instanceof Error) {
      console.error(`   cause: ${details.message}`);
      if (details.stack) console.error(details.stack);
    } else if (details !== undefined) {
      console.error(`   cause: ${JSON.stringify(details, null, 2)}`);
    }

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
