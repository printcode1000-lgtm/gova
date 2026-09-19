/**
 * Contract test: the installed-app name users see is the public product name
 * (`Pbook` / `بيبوك`), while the native package identity keeps its historical
 * technical identifiers.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../..",
);

function repoFile(relativePath: string): string {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function androidString(xml: string, name: string): string | undefined {
  return xml.match(new RegExp(`<string name="${name}">([^<]*)</string>`))?.[1];
}

function plistString(xml: string, key: string): string | undefined {
  return xml.match(new RegExp(`<key>${key}</key>\\s*<string>([^<]*)</string>`))?.[1];
}

function localizedString(strings: string, key: string): string | undefined {
  return strings.match(new RegExp(`"${key}"\\s*=\\s*"([^"]*)";`))?.[1];
}

const androidDefault = repoFile("android/app/src/main/res/values/strings.xml");
const androidArabic = repoFile("android/app/src/main/res/values-ar/strings.xml");
assert.equal(androidString(androidDefault, "app_name"), "Pbook");
assert.equal(androidString(androidDefault, "title_activity_main"), "Pbook");
assert.equal(androidString(androidArabic, "app_name"), "بيبوك");
assert.equal(androidString(androidArabic, "title_activity_main"), "بيبوك");
// Identity stays internal and unchanged.
assert.equal(androidString(androidDefault, "package_name"), "hgh.asol.app");
assert.equal(androidString(androidDefault, "custom_url_scheme"), "hgh.asol.app");
assert.equal(androidString(androidArabic, "package_name"), undefined);
assert.match(repoFile("android/app/src/main/AndroidManifest.xml"), /android:label="@string\/app_name"/);

for (const target of ["ios/App/App", "ios/ShareExtension"]) {
  const plist = repoFile(`${target}/Info.plist`);
  assert.equal(plistString(plist, "CFBundleDisplayName"), "Pbook", `${target} display name`);
  assert.equal(plistString(plist, "CFBundleIdentifier"), "$(PRODUCT_BUNDLE_IDENTIFIER)");
  const arabic = repoFile(`${target}/ar.lproj/InfoPlist.strings`);
  assert.equal(localizedString(arabic, "CFBundleDisplayName"), "بيبوك", `${target} Arabic name`);
}
assert.doesNotMatch(repoFile("ios/App/App/Info.plist"), /\bASOL\b/);

const project = repoFile("ios/App/App.xcodeproj/project.pbxproj");
assert.match(project, /knownRegions = \([^)]*\bar,/);
assert.equal(project.match(/path = ar\.lproj\/InfoPlist\.strings;/g)?.length, 2);
assert.equal(project.match(/InfoPlist\.strings in Resources \*\/,/g)?.length, 2);
assert.match(project, /PRODUCT_BUNDLE_IDENTIFIER = hgh\.asol\.app;/);

const capacitor = repoFile("capacitor.config.ts");
assert.match(capacitor, /appName: "Pbook"/);
assert.match(capacitor, /appId: "hgh\.asol\.app"/);

console.log("✅ public app name contract test passed");
