import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

import dotenv from "dotenv";
import nodemailer from "nodemailer";

import { androidRunbookStatsByTab } from "@asol/release-core/console/android-release-runbook";

if (existsSync(".env.local")) dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ path: ".env", quiet: true });

const RECIPIENT = process.argv[2] ?? "print.code.1000@gmail.com";

function gitHead(): string {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "(unknown)";
  }
}

function buildReport(): string {
  const stats = androidRunbookStatsByTab();
  const priorityTabs = ["release-android", "android-build-debug", "cap-prepare-android"] as const;
  const runbookLines = priorityTabs.map((tab) => {
    const item = stats[tab];
    return `- ${tab}: ${item.branches} branches, ${item.sections} sections, ${item.phases} phases`;
  });

  return [
    "Android build preflight coordinator — completion summary",
    "",
    `Commit: ${gitHead()}`,
    "",
    "Preflight coverage (all repository APK/AAB entry points):",
    "- npm run android:preflight — standalone JDK/SDK/gradlew check",
    "- npm run android:build:debug — runAndroidBuildPreflight before cap:prepare + runGradle",
    "- npm run android:build:signed — runAndroidBuildPreflight before bundleRelease/assembleRelease",
    "- npm run release:android — runAndroidBuildPreflight before cap-build + signing",
    "- npm run cap:build (--no-r8 / assembleNoR8) — runGradle preflight",
    "- npm run android:r8:verify-release — runGradle preflight + npm script gate",
    "- npm run android:device:tests — runAndroidBuildPreflight before connectedDebugR8AndroidTest",
    "- npm run cap:run:clean:android — runAndroidBuildPreflight before cap run (Gradle packaging)",
    "- npm run fastlane:android:* (except doctor) — fastlane-runner spawns android-build-preflight.ts",
    "- scripts/android/gradle.ts runGradle — preflight on every Gradle invocation",
    "",
    "Runbook tree (priority tabs):",
    ...runbookLines,
    "",
    "Tests: npm run test:native-core && npm run test:release-commands",
  ].join("\n");
}

async function main(): Promise<void> {
  const user = process.env.PASSWORD_RECOVERY_GMAIL_USER?.trim();
  const pass = process.env.PASSWORD_RECOVERY_GMAIL_APP_PASSWORD?.trim();
  if (!user || !pass) {
    throw new Error(
      "Missing PASSWORD_RECOVERY_GMAIL_USER or PASSWORD_RECOVERY_GMAIL_APP_PASSWORD in .env.local",
    );
  }

  const text = buildReport();
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: `ASOL Release Coordinator <${user}>`,
    to: RECIPIENT,
    subject: "Android preflight + runbook coordinator complete",
    text,
    html: `<pre style="font-family:Consolas,monospace;line-height:1.5;white-space:pre-wrap">${text.replace(/</g, "&lt;")}</pre>`,
  });

  console.log(`Coordinator completion email sent to ${RECIPIENT}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
