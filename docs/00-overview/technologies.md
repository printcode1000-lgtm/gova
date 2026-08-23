# ASOL technology and environment baseline

This is the human-readable dependency and toolchain baseline. `package-lock.json`
is the canonical, complete record for every transitive npm package; the tables
below list every direct production and development package at the exact version
verified on 2026-08-14. Do not copy versions from an article or a global install.

Run `npm run doctor:environment` after cloning the repository or moving to a new
machine. It compares the machine and `node_modules` with this baseline and the
lockfile, checks the selected web/production/mobile scenario, and reports
install, update, or configuration actions without modifying the machine.

## Host and release toolchain

| Tool | Supported or pinned version | Purpose |
|---|---:|---|
| Node.js | `>=22 <25`; Node `24.x LTS` recommended | Web, scripts, services, Capacitor CLI |
| npm | `11.19.0` | Reproducible installation from lockfile; npm 12 is not adopted because its install-script/remote-package policy blocks current native and Tailwind dependencies |
| Git | `>=2.40`; verified with `2.55.0` | Source and the single GitHub-linked main deployment |
| Next.js | `16.3.1` | Hosted application and static export |
| React / React DOM | `19.2.8` | UI runtime |
| TypeScript | `5.9.3` | Checked compiler line; TypeScript 7 is intentionally not adopted until the complete toolchain is verified against it |
| Vercel CLI | `59.0.0`, ephemeral | Service deployment only; invoked through pinned `npx`, never installed in the application dependency tree |
| Drizzle Kit | `0.31.10`, ephemeral | Schema tooling through `npm run db:drizzle` |
| Java | JDK `21 LTS` | Android Gradle toolchain |

On Windows, point `JAVA_HOME` at the installed JDK root (for example `C:\Program Files\Java\jdk-21.0.12`), not the generic `jdk-21` path unless that directory actually exists. Android Studio's bundled runtime at `C:\Program Files\Android\Android Studio\jbr` also satisfies the requirement. Repository Gradle scripts run `packages/native-core/scripts/android-build-preflight.ts` before any Gradle task: it resolves invalid `JAVA_HOME` by searching `jdk-21*` install directories and Android Studio JBR, resolves the Android SDK root, and stops with a bilingual error when a path cannot be resolved after search. Direct `android\gradlew.bat` calls and Android Studio still rely on a correct user `JAVA_HOME`. See [invalid-java-home-windows.md](../08-troubleshooting/problems/invalid-java-home-windows.md).
| Gradle | wrapper `9.4.1` | Android builds; no global Gradle installation |
| Android Gradle Plugin | `9.2.1` | Android application build |
| Android SDK | compile/target `36`, minimum `24` | Android platform baseline |
| Google Services Gradle plugin | `4.4.4` | Firebase configuration |
| Firebase Messaging Android | `25.0.1` | Application-owned push delivery |
| Fastlane | `2.237.0` from `Gemfile.lock` | Android/iOS release automation |
| Xcode | Current stable Xcode and iOS SDK on macOS | iOS build/signing; detected rather than fabricated or globally pinned on Windows/Linux |

The isolated `notifications`, `products`, `orders`, and `profiles` Vercel
services each carry their own `package.json` and `package-lock.json`. All four
pin Node `>=22 <25`, npm `11.19.0`, Next.js `16.3.1`, React/React DOM `19.2.8`,
TypeScript `5.9.3`, and the matching type packages. The environment doctor
compares every service lockfile with the root runtime so a service cannot
silently remain on an older framework release.

## Direct production packages

| Package | Exact verified version |
|---|---:|
| `@aws-sdk/client-s3` | `3.1110.0` |
| `@aws-sdk/s3-request-presigner` | `3.1110.0` |
| `@capacitor-mlkit/barcode-scanning` | `8.1.0` |
| `@capacitor/action-sheet` | `8.1.1` |
| `@capacitor/android` | `8.5.0` |
| `@capacitor/app` | `8.1.1` |
| `@capacitor/browser` | `8.0.4` |
| `@capacitor/camera` | `8.2.2` |
| `@capacitor/cli` | `8.5.0` |
| `@capacitor/clipboard` | `8.0.1` |
| `@capacitor/core` | `8.5.0` |
| `@capacitor/device` | `8.0.3` |
| `@capacitor/dialog` | `8.0.1` |
| `@capacitor/filesystem` | `8.1.2` |
| `@capacitor/geolocation` | `8.2.2` |
| `@capacitor/haptics` | `8.0.2` |
| `@capacitor/ios` | `8.5.0` |
| `@capacitor/keyboard` | `8.0.5` |
| `@capacitor/local-notifications` | `8.2.1` |
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
| `@capgo/capacitor-speech-recognition` | `8.1.10` |
| `@fortawesome/fontawesome-svg-core` | `7.3.1` |
| `@fortawesome/free-brands-svg-icons` | `7.3.1` |
| `@fortawesome/free-solid-svg-icons` | `7.3.1` |
| `@fortawesome/react-fontawesome` | `3.5.0` |
| `@hookform/resolvers` | `5.8.0` |
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
| `@tanstack/react-query` | `5.101.4` |
| `@tanstack/react-query-persist-client` | `5.101.4` |
| `@types/web-push` | `3.6.4` |
| `better-sqlite3` | `13.0.3` |
| `class-variance-authority` | `0.7.1` |
| `clsx` | `2.1.1` |
| `dotenv` | `17.4.2` |
| `drizzle-orm` | `0.45.2` |
| `drizzle-zod` | `0.8.3` |
| `fflate` | `0.8.3` |
| `focus-trap-react` | `12.0.3` |
| `google-auth-library` | `11.0.2` |
| `heic-to` | `1.5.2` |
| `lucide-react` | `1.31.0` |
| `maplibre-gl` | `6.3.0` |
| `next` | `16.3.1` |
| `nodemailer` | `9.0.5` |
| `qrcode` | `1.5.4` |
| `react` | `19.2.8` |
| `react-dom` | `19.2.8` |
| `react-hook-form` | `7.85.0` |
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
| `@types/react-dom` | `19.2.4` |
| `@types/supercluster` | `7.1.3` |
| `cross-env` | `10.1.0` |
| `eslint` | `10.8.1` |
| `eslint-config-next` | `16.3.1` |
| `prettier` | `3.9.6` |
| `prettier-plugin-tailwindcss` | `0.8.1` |
| `tailwindcss` | `4.3.3` |
| `tsx` | `4.23.12` |
| `typescript` | `5.9.3` |

## Installation and update policy

1. Install Node 24 LTS, npm 11.19.0, and Git.
2. On Windows, install a real Python 3.12+ on `PATH` (not the Microsoft Store
   stub) before the first `npm ci`. `better-sqlite3`'s approved install script
   may fall back to `node-gyp`, which fails without Python. See
   `docs/08-troubleshooting/problems/npm-ci-better-sqlite3-python-windows.md`.
3. Run `npm ci`; the approved install scripts are pinned in `allowScripts` for
   `better-sqlite3`, `esbuild`, and `unrs-resolver` so a fresh machine builds
   exactly the native/tool binaries the project requires. After install,
   `node_modules/@asol/*` must cover every `packages/*` workspace — see
   `docs/08-troubleshooting/problems/incomplete-npm-workspaces-asol-modules.md`.
4. Run `npm run doctor:environment` and follow only the actions for the intended
   scenario.
5. Run `npm run verify:all` before deployment.
6. `npm outdated` is advisory. Compatible range updates may be installed and
   verified together. Major lines require build, architecture, web, and relevant
   native tests. This is why TypeScript 7 is reported for review rather than
   installed automatically.

The `uuid` override is pinned to `11.1.1` because Capacitor CLI's current
`xcode` dependency otherwise resolves a vulnerable older UUID line. `postcss`
is pinned to `8.5.25` for the verified Tailwind/Next toolchain.
