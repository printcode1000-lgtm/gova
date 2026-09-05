<!-- GENERATED FILE. DO NOT EDIT BY HAND.
     Source: live repository graph built by scripts/docs/.
     Regenerate: npm run docs:generate
     Validate: npm run docs:ci -->

# Native Capability Map

Entries: **28**

| Platform | Capability | Source | Features | Packages | Notes |
|---|---|---|---|---|---|
| android | `android.permission.ACCESS_COARSE_LOCATION` | `android/app/src/main/AndroidManifest.xml` | `src/features/location` | `@asol/data-core`, `@asol/storage-core` | AndroidManifest permission/component |
| android | `android.permission.ACCESS_FINE_LOCATION` | `android/app/src/main/AndroidManifest.xml` | `src/features/location` | `@asol/data-core`, `@asol/storage-core` | AndroidManifest permission/component |
| android | `android.permission.CAMERA` | `android/app/src/main/AndroidManifest.xml` | unknown | unknown | AndroidManifest permission/component |
| android | `android.permission.INTERNET` | `android/app/src/main/AndroidManifest.xml` | unknown | unknown | AndroidManifest permission/component |
| android | `android.permission.POST_NOTIFICATIONS` | `android/app/src/main/AndroidManifest.xml` | `src/features/notifications` | `@asol/account-bridge`, `@asol/account-declarations`, `@asol/data-core`, `@asol/notifications-composition`, `@asol/notifications-core` | AndroidManifest permission/component |
| android | `android.permission.READ_EXTERNAL_STORAGE` | `android/app/src/main/AndroidManifest.xml` | `src/features/storage` | `@asol/backup-core`, `@asol/env-core`, `@asol/storage-core`, `@asol/storage-image-manager-core` | AndroidManifest permission/component |
| android | `android.permission.READ_MEDIA_IMAGES` | `android/app/src/main/AndroidManifest.xml` | unknown | `@asol/env-core`, `@asol/google-play-store-assets-core` | AndroidManifest permission/component |
| android | `android.permission.READ_MEDIA_VIDEO` | `android/app/src/main/AndroidManifest.xml` | unknown | `@asol/env-core` | AndroidManifest permission/component |
| android | `android.permission.READ_MEDIA_VISUAL_USER_SELECTED` | `android/app/src/main/AndroidManifest.xml` | unknown | `@asol/env-core` | AndroidManifest permission/component |
| android | `android.permission.RECEIVE_BOOT_COMPLETED` | `android/app/src/main/AndroidManifest.xml` | unknown | unknown | AndroidManifest permission/component |
| android | `android.permission.RECORD_AUDIO` | `android/app/src/main/AndroidManifest.xml` | unknown | unknown | AndroidManifest permission/component |
| android | `android.permission.WRITE_EXTERNAL_STORAGE` | `android/app/src/main/AndroidManifest.xml` | `src/features/storage` | `@asol/backup-core`, `@asol/storage-core`, `@asol/storage-image-manager-core` | AndroidManifest permission/component |
| android | `capacitor-plugin-wiring` | `android/capacitor.settings.gradle` | unknown | `@asol/native-core` | Capacitor plugin/native wiring evidence |
| android | `capacitor-plugin-wiring` | `android/variables.gradle` | unknown | `@asol/native-core` | Capacitor plugin/native wiring evidence |
| android | `notification-channel` | `android/app/src/main/AndroidManifest.xml` | `src/features/notifications` | `@asol/account-bridge`, `@asol/account-declarations`, `@asol/data-core`, `@asol/notifications-composition`, `@asol/notifications-core` | notification channel configuration evidence |
| android | `notification-channel` | `android/app/src/main/res/values/strings.xml` | `src/features/notifications` | `@asol/account-bridge`, `@asol/account-declarations`, `@asol/data-core`, `@asol/notifications-composition`, `@asol/notifications-core` | notification channel configuration evidence |
| ios | `aps-environment` | `ios/App/App/App.entitlements` | unknown | `@asol/env-core` | entitlement key |
| ios | `CFBundleURLTypes` | `ios/App/App/Info.plist` | unknown | unknown | Info.plist capability/usage key |
| ios | `com.apple.developer.associated-domains` | `ios/App/App/App.entitlements` | unknown | `@asol/dev-core` | entitlement key |
| ios | `com.apple.security.application-groups` | `ios/App/App/App.entitlements` | unknown | `@asol/api-contract-core` | entitlement key |
| ios | `NSCameraUsageDescription` | `ios/App/App/Info.plist` | unknown | unknown | Info.plist capability/usage key |
| ios | `NSDocumentsFolderUsageDescription` | `ios/App/App/Info.plist` | unknown | unknown | Info.plist capability/usage key |
| ios | `NSLocationWhenInUseUsageDescription` | `ios/App/App/Info.plist` | unknown | unknown | Info.plist capability/usage key |
| ios | `NSMicrophoneUsageDescription` | `ios/App/App/Info.plist` | unknown | unknown | Info.plist capability/usage key |
| ios | `NSPhotoLibraryAddUsageDescription` | `ios/App/App/Info.plist` | unknown | unknown | Info.plist capability/usage key |
| ios | `NSPhotoLibraryUsageDescription` | `ios/App/App/Info.plist` | unknown | unknown | Info.plist capability/usage key |
| ios | `NSSpeechRecognitionUsageDescription` | `ios/App/App/Info.plist` | unknown | unknown | Info.plist capability/usage key |
| shared | `capacitor-config` | `capacitor.config.ts` | unknown | `@asol/native-core` | Capacitor webDir consumes static out/ |
