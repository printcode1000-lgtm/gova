import assert from "node:assert/strict";
import { validateAndroidR8PolicySources, type AndroidR8PolicySources } from "./validate-android-r8-policy";

const valid: AndroidR8PolicySources = {
  buildGradle: `android { buildTypes { debugR8 { minifyEnabled true; shrinkResources true; debuggable true; signingConfig signingConfigs.debug; proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'; testProguardFiles 'proguard-rules-test-apk.pro' } release { minifyEnabled true; shrinkResources true; proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro' } releaseNoR8 { minifyEnabled false; versionNameSuffix '-nor8' } } } // asol.allowNoR8`,
  properties: "android.useAndroidX=true",
  appRules: `-keepattributes RuntimeVisibleAnnotations\n-keepclassmembers class * { @android.webkit.JavascriptInterface <methods>; }\n-keep class androidx.work.impl.WorkDatabase_Impl { *; }\n-keep class * extends androidx.room.RoomDatabase { *; }`,
  capacitorRules: `-keep public class * extends com.getcapacitor.Plugin { *; }\n-keepclassmembers class * { @com.getcapacitor.PluginMethod <methods>; }`,
  fastfile: `lane :production do\n upload_to_play_store(track: "production")\nend`,
};

assert.doesNotThrow(() => validateAndroidR8PolicySources(valid));
for (const unsafe of [
  "-keep class androidx.work.impl.WorkDatabase_Impl { public <init>(); }",
  "-keep class androidx.work.impl.WorkDatabase_Impl",
]) {
  const appRules = valid.appRules.replace("-keep class androidx.work.impl.WorkDatabase_Impl { *; }", unsafe);
  assert.throws(() => validateAndroidR8PolicySources({ ...valid, appRules }), /preserve every WorkDatabase_Impl member/);
}
console.log("Android R8 WorkManager startup regression tests passed.");
