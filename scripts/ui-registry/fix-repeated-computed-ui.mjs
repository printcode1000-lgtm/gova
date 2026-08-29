import { readFileSync, writeFileSync } from "node:fs";

function replaceExact(file, before, after, expected = 1) {
  const source = readFileSync(file, "utf8");
  const count = source.split(before).length - 1;
  if (count !== expected) throw new Error(`${file}: expected ${expected} exact match(es), found ${count}`);
  writeFileSync(file, source.split(before).join(after), "utf8");
}

function removeBetween(file, startMarker, endMarker) {
  const source = readFileSync(file, "utf8");
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error(`${file}: start marker not found`);
  const endStart = source.indexOf(endMarker, start);
  if (endStart < 0) throw new Error(`${file}: end marker not found`);
  const end = endStart + endMarker.length;
  if (source.indexOf(startMarker, start + 1) >= 0) throw new Error(`${file}: start marker is not unique`);
  writeFileSync(file, `${source.slice(0, start)}${source.slice(end)}`, "utf8");
}

// Returns: one source UID for the repeated radio usage plus a stable policy instance.
const returnsFile = "src/features/onboarding/presentation/sections/returns-section.tsx";
replaceExact(returnsFile, "import type { UiDescriptor } from '@asol/ui-registry-core';\n", "");
replaceExact(
  returnsFile,
  'import { uiAttributes } from "@asol/ui-registry-core";',
  'import { createUiInstanceId, uiAttributes } from "@asol/ui-registry-core";',
);
removeBetween(
  returnsFile,
  "/**\n * Each policy option is registered from its own stable domain id",
  "} as const satisfies Record<ReturnPolicyType, UiDescriptor>;\n\n",
);
replaceExact(
  returnsFile,
  '<RadioGroupItem ui={{ uid: "onboarding.sections.returns-section.radio-group-item-t90iyB", id: "onboarding.sections.returns-section.radio-group-item" }} ui={POLICY_TYPE_UI[policy]} value={policy}',
  '<RadioGroupItem ui={{ uid: "onboarding.sections.returns-section.radio-group-item-t90iyB", id: "onboarding.sections.returns-section.radio-group-item", kind: "field", action: "select-policy", part: "policy", instance: createUiInstanceId(policy) }} value={policy}',
);
for (const [uid, id] of [
  ["onboarding.sections.returns-section.div.8-PeZ3VH", "onboarding.sections.returns-section.div.8"],
  ["onboarding.sections.returns-section.div.9-Y3QGzW", "onboarding.sections.returns-section.div.9"],
  ["onboarding.sections.returns-section.label.3-gYY3L0", "onboarding.sections.returns-section.label.3"],
  ["onboarding.sections.returns-section.p-55UNY5", "onboarding.sections.returns-section.p"],
]) {
  replaceExact(
    returnsFile,
    `uid: "${uid}", id: "${id}"`,
    `uid: "${uid}", id: "${id}", instance: createUiInstanceId(policy)`,
  );
}

// Release console tabs: one source UID plus stable tab-id instance. The old
// descriptor-per-domain-entry table is no longer a second identity source.
const releaseFile = "src/features/google-play-console/presentation/ReleaseConsolePage.tsx";
replaceExact(
  releaseFile,
  'import { uiAttributes } from "@asol/ui-registry-core";',
  'import { createUiInstanceId, uiAttributes } from "@asol/ui-registry-core";',
);
replaceExact(
  releaseFile,
  '<TabsTrigger key={tab.id} ui={{ uid: "google-play-console.release-console-page.tabs-trigger-ti6F5i", id: "google-play-console.release-console-page.tabs-trigger" }} ui={tab.ui} value={tab.id}',
  '<TabsTrigger key={tab.id} ui={{ uid: "google-play-console.release-console-page.tabs-trigger-ti6F5i", id: "google-play-console.release-console-page.tabs-trigger", kind: "action", action: "select-tab", part: "tabs", instance: createUiInstanceId(tab.id) }} value={tab.id}',
);
replaceExact(
  releaseFile,
  'ui={{ uid: "google-play-console.release-console-page.tabs-content-EwQ1z1", id: "google-play-console.release-console-page.tabs-content" }} value={tab.id}',
  'ui={{ uid: "google-play-console.release-console-page.tabs-content-EwQ1z1", id: "google-play-console.release-console-page.tabs-content", instance: createUiInstanceId(tab.id) }} value={tab.id}',
);

const tabRegistryFile = "src/features/google-play-console/presentation/tabs/tab-registry.ts";
replaceExact(tabRegistryFile, 'import type { UiDescriptor } from "@asol/ui-registry-core";\n', "");
replaceExact(
  tabRegistryFile,
  '  /** Per-tab UiRegistry identity, keyed by the tab\'s own stable domain id. */\n  ui: UiDescriptor;\n',
  '',
);
{
  const source = readFileSync(tabRegistryFile, "utf8");
  const matches = [...source.matchAll(/\n    ui: \{[^\n]+\}, enabled \},/g)];
  if (matches.length !== 9) throw new Error(`${tabRegistryFile}: expected 9 per-tab ui records, found ${matches.length}`);
  const next = source.replace(/\n    ui: \{[^\n]+\}, enabled \},/g, " enabled },");
  writeFileSync(tabRegistryFile, next, "utf8");
}

// Verification: repeated documents/badges use one literal source UID each and
// a safe instance from the authored domain token.
const verificationFile = "src/features/onboarding/presentation/sections/verification-section.tsx";
replaceExact(verificationFile, "import type { UiDescriptor } from '@asol/ui-registry-core';\n", "");
replaceExact(
  verificationFile,
  "import { uiAttributes } from '@asol/ui-registry-core';",
  "import { createUiInstanceId, uiAttributes } from '@asol/ui-registry-core';",
);
removeBetween(
  verificationFile,
  "/**\n * One descriptor per document type and per badge",
  "} as const satisfies Record<(typeof AVAILABLE_BADGES)[number]['id'], UiDescriptor>;\n\n",
);
replaceExact(
  verificationFile,
  '<Button ui={{ uid: "onboarding.sections.verification-section.button-aRRh9u", id: "onboarding.sections.verification-section.button" }}\n                      ui={DOCUMENT_REMOVE_UI[docType]}',
  '<Button ui={{ uid: "onboarding.sections.verification-section.button-aRRh9u", id: "onboarding.sections.verification-section.button", kind: "action", action: "remove-document", part: "documents", instance: createUiInstanceId(docType) }}',
);
replaceExact(
  verificationFile,
  '<Button ui={{ uid: "onboarding.sections.verification-section.button.2-1Ku4EF", id: "onboarding.sections.verification-section.button.2" }}\n                        ui={DOCUMENT_UPLOAD_UI[docType]}',
  '<Button ui={{ uid: "onboarding.sections.verification-section.button.2-1Ku4EF", id: "onboarding.sections.verification-section.button.2", kind: "action", action: "upload-document", part: "documents", instance: createUiInstanceId(docType) }}',
);
replaceExact(
  verificationFile,
  'key={badge.id} {...uiAttributes({ uid: "onboarding.sections.verification-section.button.3-nWRX6w", id: "onboarding.sections.verification-section.button.3" })}\n                  {...uiAttributes(BADGE_UI[badge.id])}',
  'key={badge.id} {...uiAttributes({ uid: "onboarding.sections.verification-section.button.3-nWRX6w", id: "onboarding.sections.verification-section.button.3", kind: "action", action: "toggle-badge", part: "badges", instance: createUiInstanceId(badge.id) })}',
);
for (const [uid, id] of [
  ["onboarding.sections.verification-section.div.12-pxDN2K", "onboarding.sections.verification-section.div.12"],
  ["onboarding.sections.verification-section.div.13-pvW0FE", "onboarding.sections.verification-section.div.13"],
  ["onboarding.sections.verification-section.div.14-PP1jy9", "onboarding.sections.verification-section.div.14"],
  ["onboarding.sections.verification-section.badge-CK4gJi", "onboarding.sections.verification-section.badge"],
  ["onboarding.sections.verification-section.p.5-XDd8P7", "onboarding.sections.verification-section.p.5"],
  ["onboarding.sections.verification-section.div.15-S1Vo3t", "onboarding.sections.verification-section.div.15"],
  ["onboarding.sections.verification-section.span.4-Pc52NF", "onboarding.sections.verification-section.span.4"],
]) {
  replaceExact(
    verificationFile,
    `uid: "${uid}", id: "${id}"`,
    `uid: "${uid}", id: "${id}", instance: createUiInstanceId(docType)`,
  );
}
for (const [uid, id] of [
  ["onboarding.sections.verification-section.span.5-nZDhC9", "onboarding.sections.verification-section.span.5"],
  ["onboarding.sections.verification-section.div.17-jRe52Y", "onboarding.sections.verification-section.div.17"],
  ["onboarding.sections.verification-section.p.6-Y7ubx5", "onboarding.sections.verification-section.p.6"],
  ["onboarding.sections.verification-section.p.7-s1USLn", "onboarding.sections.verification-section.p.7"],
]) {
  replaceExact(
    verificationFile,
    `uid: "${uid}", id: "${id}"`,
    `uid: "${uid}", id: "${id}", instance: createUiInstanceId(badge.id)`,
  );
}

console.log("Repeated computed UI migration cleanup applied.");
