# High-Risk Areas & Technical Debt

## 1. Static Bundle Overwriting (`out/`)

- **Risk**: Running `npm run build:static` immediately overwrites the release `out/` bundle directory.
- **Impact**: Accidental execution during routine development can replace a production-ready static export with unvalidated or development-configured assets.
- **Rule**: Never run `npm run build:static` merely as a quick check; use `npm run runtime:check:static` or dedicated test scripts.

---

## 2. Multi-Account Database Schema Provisioning

- **Risk**: The project spans 7 distinct Turso databases across different developer/team accounts.
- **Impact**: Schema migrations (`npm run db:schema:sync`) must be coordinated so that table additions/alterations do not break service mirrors or static client query assumptions.
- **Guard**: Run `cross-env ASOL_PROVISIONING=true npm run db:schema:sync` with explicit validation scripts before deploying updated services.

---

## 3. Native Capacitor Plugin Synchronization & Android R8

- **Risk**: Adding or updating Capacitor plugins in `package.json` without updating `packages/native-core` and native shell configurations.
- **Impact**:
  - Android build failure or runtime crash if R8 ProGuard rules strip dynamic native reflection calls.
  - Native permissions or backup rules out of sync.
- **Guard**: Always run `npm run cap:sync`, `npm run android:r8:validate`, and `npm run android:backup:validate` when modifying native platform integrations.

---

## 4. Secret Archive Key & Backup Integrity

- **Risk**: Project secrets (`.env` files, FCM keys, APNs certs, Turso tokens) are backed up into encrypted archives via `@asol/secrets-core`.
- **Impact**: Loss of the secret archive key (`ASOL_SECRET_ARCHIVE_KEY`) prevents disaster recovery and automated deploy runbooks from restoring environment credentials.
- **Guard**: Verify secret backup integrity using `npm run secrets:verify`.

---

## 5. OTA Version Compatibility vs Native Shell

- **Risk**: Publishing an OTA web update that calls a Capacitor plugin method not compiled into the installed native store binary.
- **Impact**: Mobile app crash or silent failure on older installed client versions.
- **Guard**: `ota:publish` checks native plugin compatibility against the store baseline before allowing bundle uploads.
