# ASOL technology and environment baseline

This is the human-readable dependency and toolchain baseline. The immutable,
machine-checked reference is `config/runtime-compatibility-reference.json`;
`package-lock.json` remains the complete transitive npm record. The tables below
list every direct production and development package at the exact version
verified on 2026-08-24. Do not copy versions from an article or a global install.

Run `npm run doctor:environment` after cloning the repository or moving to a new
machine. It compares the machine and `node_modules` with this baseline and the
lockfile, checks the selected web/production/mobile scenario, and reports
install, update, or configuration actions without modifying the machine.

`npm run architecture:check`, `npm run runtime:compatibility:check`, and the
generated build/test gates reject any unreviewed drift in the root dependency
graph, all `packages/*` workspaces, every automatically discovered
`services/*` runtime, Ruby gems, or the pinned Android/deployment toolchain. A
reference rewrite is deliberately unavailable as a normal npm script. After a
fully verified upgrade, an authorized maintainer must explicitly run:

```bash
npx tsx scripts/runtime-compatibility-reference.ts --write --confirm-reviewed-compatible-tree
```

The adversarial `npm run test:runtime-compatibility` gate proves that a new
package, service, lock graph, or tool version cannot pass without that review.

## Host and release toolchain

| Tool | Supported or pinned version | Purpose |
|---|---:|---|
| Node.js | `>=22 <25`; Node `24.x LTS` recommended | Web, scripts, services, Capacitor CLI |
| npm | `11.19.0` | Reproducible installation from lockfile; npm 12 is not adopted because its install-script/remote-package policy blocks current native and Tailwind dependencies |
| Git | `>=2.40`; verified with `2.55.0` | Source and the single GitHub-linked main deployment |
| Next.js | `16.3.2` | Hosted application and static export |
| React / React DOM | `19.2.8` | UI runtime |
| TypeScript | `5.9.3` | Checked compiler line; TypeScript 7 is intentionally not adopted until the complete toolchain is verified against it |
| Vercel CLI | `59.0.0`, exact direct dependency | Service deployment only; scripts resolve the reviewed local binary from `node_modules` rather than a mutable global/latest CLI |
| Drizzle Kit | `0.31.10`, ephemeral | Schema tooling through `npm run db:drizzle` |
| Java | JDK `21 LTS` | Android Gradle toolchain |

| Gradle | wrapper `9.4.1` | Android builds; no global Gradle installation |
| Android Gradle Plugin | `9.2.1` | Android application build |
| Android SDK | compile/target `36`, minimum `24` | Android platform baseline |
| Google Services Gradle plugin | `4.4.4` | Firebase configuration |
| Firebase Messaging Android | `25.0.1` | Application-owned push delivery |
| Fastlane | `2.237.0` from `Gemfile.lock` | Android/iOS release automation |
| Xcode | Current stable Xcode and iOS SDK on macOS | iOS build/signing; detected rather than fabricated or globally pinned on Windows/Linux |

On Windows, point `JAVA_HOME` at a valid JDK 21 root or use Android Studio's
bundled JBR. The Android preflight resolves either source before Gradle runs;
direct Gradle and Android Studio usage still require a valid configured Java
path. See [invalid-java-home-windows.md](../08-troubleshooting/problems/invalid-java-home-windows.md).

`npm run doctor:environment` classifies the machine with
`scripts/runtime-compatibility-policy.ts`:

| Host class | Meaning |
|---|---|
| `canonical-baseline-host` | Node is in `>=22 <25` and `config/runtime-compatibility-reference.json` matches |
| `compatible-host` | Node is in range; the host may differ from the reviewed baseline. Do not rewrite lockfiles or the reference to accommodate it |
| `unsupported-host` | Node is outside `>=22 <25` |

Platform-specific checks that cannot run are **evidence gaps**, not passes. On
non-macOS the doctor prints `ios-compile-sign` (Xcode compile/archive/sign) and
must not mark that row `OK`. Do not rewrite
`config/runtime-compatibility-reference.json` for a different host.

The six isolated Vercel services under `services/*` each carry their own
`package.json` and `package-lock.json`. They pin Node `>=22 <25`, npm `11.19.0`,
Next.js `16.3.2`, React/React DOM `19.2.8`,
TypeScript `5.9.3`, and the matching type packages. The environment doctor
compares every service lockfile with the root runtime so a service cannot
silently remain on an older framework release.

## Direct production packages

| Package | Exact verified version |
|---|---:|
| `@aws-sdk/client-s3` | `3.1117.0` |
| `@aws-sdk/s3-request-presigner` | `3.1117.0` |
| `@capacitor-mlkit/barcode-scanning` | `8.1.0` |
| `@capacitor/action-sheet` | `8.1.1` |
| `@capacitor/android` | `8.5.0` |
| `@capacitor/app` | `8.1.1` |
| `@capacitor/browser` | `8.0.4` |
| `@capacitor/camera` | `8.2.3` |
| `@capacitor/cli` | `8.5.0` |
| `@capacitor/clipboard` | `8.0.1` |
| `@capacitor/core` | `8.5.0` |
| `@capacitor/device` | `8.0.3` |
| `@capacitor/dialog` | `8.0.1` |
| `@capacitor/filesystem` | `8.1.3` |
| `@capacitor/geolocation` | `8.2.2` |
| `@capacitor/haptics` | `8.0.2` |
| `@capacitor/ios` | `8.5.0` |
| `@capacitor/keyboard` | `8.0.5` |
| `@capacitor/local-notifications` | `8.3.1` |
| `@capacitor/network` | `8.0.1` |
| `@capacitor/preferences` | `8.0.1` |
| `@capacitor/push-notifications` | `8.1.2` |
| `@capacitor/screen-orientation` | `8.0.1` |
| `@capacitor/share` | `8.0.1` |
| `@capacitor/splash-screen` | `8.0.2` |
| `@capacitor/status-bar` | `8.0.3` |
| `@capacitor/text-zoom` | `8.0.1` |
| `@capacitor/toast` | `8.0.1` |
| `@capawesome/capacitor-file-picker` | `8.0.4` |
| `@capgo/capacitor-speech-recognition` | `8.1.11` |
| `@fortawesome/fontawesome-svg-core` | `7.3.1` |
| `@fortawesome/free-brands-svg-icons` | `7.3.1` |
| `@fortawesome/free-solid-svg-icons` | `7.3.1` |
| `@fortawesome/react-fontawesome` | `3.5.0` |
| `@hookform/resolvers` | `5.9.1` |
| `@libsql/client` | `0.17.4` |
| `@radix-ui/react-checkbox` | `1.3.11` |
| `@radix-ui/react-dialog` | `1.1.23` |
| `@radix-ui/react-dropdown-menu` | `2.1.24` |
| `@radix-ui/react-label` | `2.1.15` |
| `@radix-ui/react-progress` | `1.1.16` |
| `@radix-ui/react-radio-group` | `1.4.7` |
| `@radix-ui/react-select` | `2.3.7` |
| `@radix-ui/react-slot` | `1.3.3` |
| `@radix-ui/react-switch` | `1.3.7` |
| `@radix-ui/react-tabs` | `1.1.21` |
| `@tanstack/react-query` | `5.102.3` |
| `@tanstack/react-query-persist-client` | `5.102.3` |
| `@types/web-push` | `3.6.4` |
| `better-sqlite3` | `13.0.3` |
| `class-variance-authority` | `0.7.1` |
| `clsx` | `2.1.1` |
| `dotenv` | `17.4.2` |
| `drizzle-orm` | `0.45.2` |
| `fflate` | `0.8.3` |
| `focus-trap-react` | `12.0.3` |
| `google-auth-library` | `11.0.2` |
| `heic-to` | `1.5.2` |
| `lucide-react` | `1.34.0` |
| `maplibre-gl` | `6.6.0` |
| `next` | `16.3.2` |
| `nodemailer` | `9.0.5` |
| `qrcode` | `1.5.4` |
| `react` | `19.2.8` |
| `react-dom` | `19.2.8` |
| `react-hook-form` | `7.86.0` |
| `server-only` | `0.0.1` |
| `supercluster` | `9.0.0` |
| `tailwind-merge` | `3.6.0` |
| `tw-animate-css` | `1.4.0` |
| `web-push` | `3.6.7` |
| `zod` | `4.4.3` |
| `zustand` | `5.0.15` |

## Direct development packages

| Package | Exact verified version |
|---|---:|
| `@tailwindcss/postcss` | `4.3.3` |
| `@types/better-sqlite3` | `9.6.0` |
| `@types/geojson` | `7946.0.16` |
| `@types/node` | `24.13.3` |
| `@types/nodemailer` | `8.0.1` |
| `@types/qrcode` | `1.5.6` |
| `@types/react` | `19.2.18` |
| `@types/react-dom` | `19.2.5` |
| `@types/supercluster` | `7.1.3` |
| `cross-env` | `10.1.0` |
| `eslint` | `9.39.5` |
| `eslint-config-next` | `16.3.2` |
| `prettier` | `3.9.6` |
| `prettier-plugin-tailwindcss` | `0.8.1` |
| `tailwindcss` | `4.3.3` |
| `tsx` | `4.23.12` |
| `typescript` | `5.9.3` |

## Installation and update policy

1. Install Node 24 LTS, npm 11.19.0, and Git.
2. Run `npm run dependencies:install`. On Windows this uses `npm ci
   --ignore-scripts` because npm currently invokes `node-gyp` for
   `better-sqlite3@13` even though the package ships a compatible prebuilt
   binary. The wrapper then executes SQLite through the owning data package and
   the `esbuild` and `unrs-resolver` tool binaries, and requires `npm ls --all`
   to pass. On other
   platforms it uses ordinary `npm ci`. See
   `docs/08-troubleshooting/problems/npm-ci-better-sqlite3-python-windows.md`.
3. The approved install scripts remain pinned in `allowScripts` for
   `better-sqlite3`, `esbuild`, and `unrs-resolver`. After install,
   `node_modules/@asol/*` must cover every `packages/*` workspace — see
   `docs/08-troubleshooting/problems/incomplete-npm-workspaces-asol-modules.md`.
4. Run `npm run doctor:environment` and follow only the actions for the intended
   scenario.
5. Run `npm run verify:all` before deployment.
6. `npm run dependencies:outdated` is advisory and never changes the immutable
   reference. Compatible range updates and major lines both require the full
   build, architecture, web, static, Android, iOS, and affected service checks
   before the reference may be deliberately rewritten.

The `uuid` override is pinned to `11.1.1` because Capacitor CLI's current
`xcode` dependency otherwise resolves a vulnerable older UUID line. `postcss`
is pinned to `8.5.25` for the verified Tailwind/Next toolchain.
