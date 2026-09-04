# Build Static And Serve Out

`npm run build:static` generates a static web build in `out/` and writes `out/asol-web-manifest.json`.

## Flags

- `npx tsx scripts/build-static.ts --diagnostic`: Builds static output faster by skipping slow route and pharmacy audits. Places a marker in the manifest, which `ota-publish` rejects.
- `npx tsx packages/ota-core/scripts/ota-publish.ts --notes "text"`: Overrides automatic release notes.
- `npx tsx packages/ota-core/scripts/ota-publish.ts --mandatory`: Signs manifest with `mandatory: true`.
- `npx tsx scripts/cap-build.ts --dry-run`: Prints the complete execution plan without altering files or publishing.
- `npx tsx scripts/cap-build.ts --skip-ota`: Skips OTA publication and uses existing local manifest. Still reads live manifest on R2 to match local output against it (intended for diagnostics, not store release).
- `npx tsx scripts/cap-build.ts --no-ota`: Store release pipeline. Builds a fresh web output independently, opens a new content lineage on the shell version (`0.2.3` becomes `0.2.3.0`), and **never connects to R2** (no read, no write, no OTA credentials required). Cannot be combined with `--skip-ota` or `--resume`.
- `npx tsx scripts/cap-build.ts --no-r8 --skip-ota`: Uses the diagnostic `ReleaseNoR8` pipeline and does not allow combining with any publishing step. Accepts `--no-ota` as well.

## Safety

Never use diagnostic output for release publishing. `ota-publish` validates the marker in the local manifest and aborts execution with a clear error message.
