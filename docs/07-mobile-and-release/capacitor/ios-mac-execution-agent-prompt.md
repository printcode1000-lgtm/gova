# Autonomous Agent Prompt: Complete iOS Setup, Build, Verification & Zero-Mac Independence Guide

> **Usage Instructions:**
> When opening this repository on a **macOS** machine, copy and provide the prompt below to your AI Agent (e.g. Claude Code, Antigravity, Devin, or Cursor).
> Following this execution **once** ensures the iOS project is fully compiled, verified, committed, and configured for **permanent Zero-Mac Ongoing Development** (leveraging Cloudflare R2 OTA for daily feature updates from Windows, and GitHub Actions Cloud macOS Runners for future native builds).

---

```markdown
# MISSION PROMPT FOR AI AGENT (RUN ONCE ON MACOS)

You are tasked with executing the complete setup, native configuration, compilation, automated verification, local simulator testing, and permanent CI/CD pipeline setup for the **ASOL iOS Mobile Application** on this macOS machine.

## 1. Project Context & Native iOS Architecture
- **App Name:** ASOL
- **Bundle ID / App ID:** `hgh.asol.app`
- **Share Extension Bundle ID:** `hgh.asol.app.ShareExtension`
- **App Group:** `group.hgh.asol.app`
- **Architecture:** Next.js Static Export (`out/`) + Capacitor 8 Shell (`@capacitor/ios`) + Vercel Business API (`https://gova-swart.vercel.app`) + Cloudflare R2 OTA Engine + Firebase Cloud Messaging.
- **Dependency Management:** Swift Package Manager (`CapApp-SPM`) + Ruby Gemfile for Fastlane & Xcodeproj.
- **Native Custom Plugins (Swift):**
  1. `BackgroundDownloadPlugin.swift`: Background session download manager for OTA updates.
  2. `StorageCapacityPlugin.swift`: System disk volume check before OTA downloads.
  3. `ShareReceivePlugin.swift`: App Group bridge to receive shared content from the iOS Share Extension.
  4. `AppDelegate.swift`: Remote notification forwarding to Capacitor, background URLSession coordinator, and deep linking.
  5. `custom_notification.caf`: Bundled custom notification audio.

---

## 2. Step-by-Step Execution Plan

Execute each phase systematically in the terminal and verify results before proceeding to the next step.

### Phase 1: Environment & Toolchain Diagnostics
Run and verify:
```bash
# 1. Verify Node.js (>=22 <25) & npm (>=11 <12)
node -v
npm -v

# 2. Verify Xcode & Command Line Tools
xcodebuild -version
xcode-select -p

# 3. Install Ruby dependencies (Fastlane & Xcodeproj)
bundle install

# 4. Run environment audit specifically for iOS
npm run doctor:environment -- --scenario=ios
```

### Phase 2: Project Build & Capacitor Synchronization
```bash
# 1. Clean install node modules
npm ci

# 2. Generate native branding assets (AppIcon, LaunchScreen assets for iOS)
npm run branding:generate

# 3. Build the static bundle baked with production API URL
npm run build:static:local

# 4. Synchronize native iOS project
npx cap sync ios

# 5. Normalize SPM paths (ensures forward slashes in CapApp-SPM)
npm run ios:spm:normalize

# 6. Validate iOS Push and Identity policy
npm run ios:push:validate
```

### Phase 3: Register Share Extension & Native Custom Plugins
```bash
# 1. Register the iOS Share Extension and bridge into Xcode App.xcodeproj
ruby scripts/configure-ios-share-extension.rb

# 2. Verify Xcode project integrity & version alignment
npm run version:validate
```

### Phase 4: Configure Firebase Messaging iOS SDK (Push Notifications)
The project is architected for unified FCM delivery to iOS. Configure Firebase in Xcode:
1. Open the project in Xcode:
   ```bash
   npm run cap:open:ios
   ```
2. In Xcode:
   - Navigate to `File` > `Add Package Dependencies...`
   - Enter repository URL: `https://github.com/firebase/firebase-ios-sdk.git`
   - Select version matching current dependencies (e.g. `11.x` / `10.x`).
   - Add **`FirebaseMessaging`** and **`FirebaseCore`** products to the **`App`** target.
3. In `ios/App/App/AppDelegate.swift`:
   - Add imports at the top:
     ```swift
     import FirebaseCore
     import FirebaseMessaging
     ```
   - In `application(_:didFinishLaunchingWithOptions:)`, add:
     ```swift
     FirebaseApp.configure()
     ```
   - Ensure `GoogleService-Info.plist` is confirmed in the App target's `Copy Bundle Resources`.
4. Re-run validation:
   ```bash
   npm run ios:push:validate
   ```

### Phase 5: Xcode Signing & Capabilities Verification
In Xcode (for both `App` target and `ShareExtension` target):
- **Signing Team:** Select your active Apple Developer Account / Team ID.
- **App Target Capabilities:**
  - `Push Notifications`
  - `Background Modes` (`Remote notifications`, `Background fetch`)
  - `App Groups` (`group.hgh.asol.app`)
- **ShareExtension Target Capabilities:**
  - `App Groups` (`group.hgh.asol.app`)

### Phase 6: Automated Testing & Contract Verification
```bash
# Run all relevant contract & architecture tests
npm run architecture:check
npm run test:native-platform
npm run test:notifications
npm run test:ota-compatibility
npm run test:ota-background
npm run test:ota-hardening
```

### Phase 7: Simulator & Clean Installation Run
```bash
# Run a clean fresh installation on the iOS Simulator
# (Uninstalls any existing test container and boots a clean simulator instance)
npm run cap:run:clean:ios
```
Manual verification checklist on the booted simulator / device:
- [ ] App launches in default state: Arabic (`ar`), RTL layout, Light theme, logged out.
- [ ] Microphone permission prompt displays Arabic/English reason.
- [ ] Camera and Photo picker work with native iOS permissions.
- [ ] Speech-to-text operates properly.
- [ ] Foreground and background notification center handles events.
- [ ] OTA background download task initializes without sandbox violations.

### Phase 8: Production Build & TestFlight Distribution (Fastlane)
```bash
# 1. Check Fastlane iOS publishing prerequisites (Supports App Store Connect API Key or FASTLANE_USER)
npm run fastlane -- ios doctor

# 2. Build Release Archive / IPA
npm run fastlane -- ios build

# 3. Upload to TestFlight (Requires App Store Connect API Key / Auth)
npm run fastlane -- ios beta
```

### Phase 9: Commit All Native Artifacts to Git
To ensure you NEVER need a local Mac again:
```bash
# Stage and commit all generated project files, SPM packages, and target configurations
git add ios/ Gemfile.lock package-lock.json
git commit -m "feat(ios): complete native xcode configuration, spm dependencies, and capabilities"
git push
```

---

## 3. How Zero-Mac Ongoing Development Works

Once this setup is completed and committed to Git, you **do not need a Mac computer anymore**:

1. **Daily Updates & Features (OTA Updates via Windows/Linux):**
   - For all UI changes, React components, bug fixes, styles, new features, and backend integrations, run on Windows:
     ```bash
     npm run cap:build
     ```
   - This command compiles the web bundle, increments the OTA version, uploads verified signed full/delta bundles to Cloudflare R2, and all active iOS devices receive the update silently in the background via `BackgroundDownloadPlugin.swift`.
   
2. **Native iOS Binary Updates (Cloud CI via GitHub Actions):**
   - When native code or Capacitor core changes in the future, trigger the cloud macOS runner:
     - Navigate to GitHub Repository > **Actions** > **iOS Native Build & TestFlight Release** > **Run workflow**.
     - GitHub's cloud Mac machines automatically build the `.ipa` and publish to TestFlight using Fastlane and your App Store Connect API Key secrets.

---

## 4. Troubleshooting & Known Edge Cases
1. **Barcode Scanner:** `@capacitor-mlkit/barcode-scanning` is currently CocoaPods-only and excluded from `CapApp-SPM`. Barcode scanning is guarded to run on Android only or web fallback; if needed natively on iOS, migrate iOS shell to CocoaPods.
2. **APNs Auth Key (.p8):** Never commit the `.p8` key to Git. Upload it directly to:
   *Firebase Console > Project Settings > Cloud Messaging > Apple app configuration > APNs Authentication Key*.
3. **SPM Path Separators:** If syncing on Windows before Mac, run `npm run ios:spm:normalize` to convert backslashes to forward slashes in `CapApp-SPM/Package.swift`.
4. **Clean Session State:** To test fresh install logic without cached developer storage, always use `npm run cap:run:clean:ios`.

---
**Output Requirement:**
Report back a full summary of:
1. Environment status (`doctor:environment`).
2. Build & sync status (`build:static:local` & `cap sync ios`).
3. Verification results (`ios:push:validate` and test suites).
4. Simulator launch status and compiled IPA artifact path.
```
