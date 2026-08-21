import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  REQUIRED_JDK_MAJOR,
  buildJdkSearchReport,
  formatAndroidBuildPreflightFailure,
  isValidJavaHome,
  runAndroidBuildPreflight,
} from "./android-build-preflight";

function tempRoot(): string {
  return mkdtempSync(path.join(os.tmpdir(), "asol-android-preflight-"));
}

assert.equal(REQUIRED_JDK_MAJOR, 21);
assert.equal(isValidJavaHome(undefined), false);
assert.equal(isValidJavaHome("C:\\missing\\jdk"), false);

const fakeJavaHome = tempRoot();
mkdirSync(path.join(fakeJavaHome, "bin"), { recursive: true });
writeFileSync(path.join(fakeJavaHome, "bin", "java.exe"), "");
writeFileSync(path.join(fakeJavaHome, "release"), 'JAVA_VERSION="21.0.12"\n');
assert.equal(isValidJavaHome(fakeJavaHome), true);

const report = buildJdkSearchReport({
  ...process.env,
  JAVA_HOME: "C:\\Program Files\\Java\\jdk-21",
  ASOL_ANDROID_JAVA_HOME: fakeJavaHome,
});
assert.ok(report.some((entry) => entry.label === "ASOL_ANDROID_JAVA_HOME" && entry.status === "valid"));
assert.ok(report.some((entry) => entry.label === "JAVA_HOME" && entry.path.includes("jdk-21")));

const failureMessage = formatAndroidBuildPreflightFailure({
  missing: [`JDK ${REQUIRED_JDK_MAJOR} (JAVA_HOME points to a missing directory: C:\\Program Files\\Java\\jdk-21)`],
  jdkSearch: report,
  configuredJavaHome: "C:\\Program Files\\Java\\jdk-21",
  gradleWrapper: "C:\\repo\\android\\gradlew.bat",
});
assert.match(failureMessage, /Android build preflight failed\./);
assert.match(failureMessage, /فشل فحص ما قبل بناء Android\./);
assert.match(failureMessage, /Searched JDK locations/);
assert.match(failureMessage, /npm run doctor:environment -- --scenario=android/);

const androidRoot = tempRoot();
mkdirSync(path.join(androidRoot, "android"), { recursive: true });
writeFileSync(path.join(androidRoot, "android", "gradlew.bat"), "@echo off\r\n");
assert.throws(
  () => runAndroidBuildPreflight({
    root: androidRoot,
    env: {
      ...process.env,
      JAVA_HOME: "C:\\Program Files\\Java\\jdk-21",
      ASOL_ANDROID_JAVA_HOME: fakeJavaHome,
      ANDROID_SDK_ROOT: "",
      ANDROID_HOME: "",
      LOCALAPPDATA: path.join(androidRoot, "missing-local-app-data"),
    },
  }),
  (error: unknown) => {
    assert.ok(error instanceof Error);
    assert.match(error.message, /Android SDK/);
    assert.match(error.message, /فشل فحص ما قبل بناء Android/);
    return true;
  },
);

rmSync(fakeJavaHome, { recursive: true, force: true });
rmSync(androidRoot, { recursive: true, force: true });

console.log("android-build-preflight tests passed.");
