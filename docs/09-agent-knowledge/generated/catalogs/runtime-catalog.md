<!-- GENERATED FILE. DO NOT EDIT BY HAND.
     Source: live repository graph built by scripts/docs/.
     Regenerate: npm run docs:generate
     Validate: npm run docs:ci -->

# Runtime and Artifact Catalog

The project has five mandatory application surfaces — Development, Web, Static out, Android, and iOS — plus service/tooling execution contexts. Every change must evaluate the five application surfaces even when only some are directly mapped.

| Runtime | Summary | Commands | Config | Consumed artifacts | Directly mapped source nodes |
|---|---|---:|---:|---:|---:|
| Android | Capacitor Android shell. Production consumes out/ as webDir and adds Android-native plugins, policies, resources, signing and store artifacts. | 32 | 3 | 2 | 1680 |
| Development | Next.js development runtime on port 3001; Capacitor can optionally live-reload from it through CAPACITOR_SERVER_URL. | 2 | 2 | 0 | 2208 |
| iOS | Capacitor iOS shell. Production consumes out/ as webDir and adds iOS-native plugins, entitlements, signing, archive and TestFlight/App Store behavior. | 13 | 3 | 2 | 1667 |
| Independent services | Separately deployed service runtimes under services/*; they are not exercised by the root next start process. | 6 | 0 | 0 | 131 |
| Static out | Static Next.js export in out/. It has no bundled src/app/api handlers and must use a remote API base URL; it is the web payload copied into native shells. | 25 | 2 | 1 | 1655 |
| Tooling | Repository scripts, generators, validation, deployment orchestration and release tooling executed by Node/npm. | 282 | 3 | 0 | 177 |
| Web | Server-capable Next.js web application. Production builds produce .next and deployment may run on Vercel/serverless infrastructure. | 20 | 3 | 1 | 2208 |

## Artifact Topology

| Artifact | Path | Producers | Consumers |
|---|---|---|---|
| Android release package (APK/AAB) | `` | `npm run android:build:debug`, `npm run android:build:signed`, `npm run fastlane:android:aab:signed:no-r8`, `npm run fastlane:android:aab:signed`, `npm run fastlane:android:aab:unsigned:no-r8`, `npm run fastlane:android:aab:unsigned`, `npm run fastlane:android:apk:signed:no-r8`, `npm run fastlane:android:apk:signed`, `npm run fastlane:android:apk:unsigned:no-r8`, `npm run fastlane:android:apk:unsigned`, `npm run fastlane:android:internal`, `npm run fastlane:android:production`, `npm run release:android` | `Android` |
| iOS archive/store artifact | `` | `npm run fastlane:ios:build`, `npm run fastlane:ios:testflight` | `iOS` |
| Next server build (.next) | `.next` | `npm run build` | `Web` |
| Static export (out/) | `out` | `npm run build:static:local`, `npm run build:static` | `Android`, `iOS`, `Static out` |
