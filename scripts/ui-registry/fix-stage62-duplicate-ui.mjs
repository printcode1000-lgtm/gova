import { readFileSync, writeFileSync, unlinkSync } from "node:fs";

function replaceExact(file, before, after, expected = 1) {
  const source = readFileSync(file, "utf8");
  const count = source.split(before).length - 1;
  if (count !== expected) {
    throw new Error(`${file}: expected ${expected} exact match(es), found ${count}`);
  }
  writeFileSync(file, source.split(before).join(after), "utf8");
}

replaceExact(
  "src/features/page-save/presentation/PageSaveDialog.tsx",
  '<DialogContent ui={{ uid: "page-save.dialog-CfGhr4", id: "page-save.dialog", kind: "region", part: "dialog" }} className=',
  '<DialogContent ui={{ uid: "page-save.dialog-CfGhr4", id: "page-save.dialog", kind: "region", part: "dialog" }} id="page-save.page-save-dialog.dialog-content" className=',
);

replaceExact(
  "src/features/auth/presentation/LoginPageContent.tsx",
  'import { uiAttributes, type UiDescriptor } from "@asol/ui-registry-core";',
  'import { uiAttributes } from "@asol/ui-registry-core";',
);
replaceExact(
  "src/features/auth/presentation/LoginPageContent.tsx",
  '\nconst LOGIN_PHONE_UI: UiDescriptor = { uid: "login-phone-ChBI52", id: "login-phone", kind: "field", interaction: { type: "type", valueContract: "phone-number" }, simulation: { kind: "field", id: "login-phone" } };\n',
  '\n',
);
replaceExact(
  "src/features/auth/presentation/LoginPageContent.tsx",
  '<PhoneField ui={{ uid: "auth.login-page-content.phone-field-1vTrWC", id: "auth.login-page-content.phone-field" }} id="auth.login-page-content.div.8"\n                      ui={LOGIN_PHONE_UI}',
  '<PhoneField id="auth.login-page-content.div.8"\n                      ui={{ uid: "login-phone-ChBI52", id: "login-phone", kind: "field", interaction: { type: "type", valueContract: "phone-number" }, simulation: { kind: "field", id: "login-phone" } }}',
);

replaceExact(
  "src/features/password-recovery/presentation/PasswordRecoveryPageContent.tsx",
  'import { uiAttributes, type UiDescriptor } from "@asol/ui-registry-core";',
  'import { uiAttributes } from "@asol/ui-registry-core";',
);
replaceExact(
  "src/features/password-recovery/presentation/PasswordRecoveryPageContent.tsx",
  '\nconst PASSWORD_REQUEST_PHONE_UI: UiDescriptor = { uid: "password-request-phone-O5wE84", id: "password-request-phone", kind: "field", interaction: { type: "type", valueContract: "phone-number" }, simulation: { kind: "field", id: "password-request-phone" } };\n',
  '\n',
);
replaceExact(
  "src/features/password-recovery/presentation/PasswordRecoveryPageContent.tsx",
  '<PhoneField ui={{ uid: "password-recovery.password-recovery-page-content.phone-field-3HdPCg", id: "password-recovery.password-recovery-page-content.phone-field" }} id="password-recovery.password-recovery-page-content.div.7"\n                    ui={PASSWORD_REQUEST_PHONE_UI}',
  '<PhoneField id="password-recovery.password-recovery-page-content.div.7"\n                    ui={{ uid: "password-request-phone-O5wE84", id: "password-request-phone", kind: "field", interaction: { type: "type", valueContract: "phone-number" }, simulation: { kind: "field", id: "password-request-phone" } }}',
);

replaceExact(
  "src/features/google-play-console/presentation/DeployRunbookControls.tsx",
  'import { SELECTION_UI } from "./deploy-runbook-controls.ui";\n',
  '',
);
const runbookReplacements = [
  [
    '<Button ui={{ uid: "google-play-console.deploy-runbook-controls.button-hLJvK8", id: "google-play-console.deploy-runbook-controls.button" }}\n            ui={SELECTION_UI["select-all"]}',
    '<Button ui={{ uid: "deploy-runbook.controls.select-all-v4wrX5", id: "deploy-runbook.controls.select-all", kind: "action", action: "select-all", part: "selection" }}',
  ],
  [
    '<Button ui={{ uid: "google-play-console.deploy-runbook-controls.button.2-7NIXwJ", id: "google-play-console.deploy-runbook-controls.button.2" }}\n            ui={SELECTION_UI["select-none"]}',
    '<Button ui={{ uid: "deploy-runbook.controls.select-none-q9bRsA", id: "deploy-runbook.controls.select-none", kind: "action", action: "select-none", part: "selection" }}',
  ],
  [
    '<Button ui={{ uid: "google-play-console.deploy-runbook-controls.button.3-AI1Zt8", id: "google-play-console.deploy-runbook-controls.button.3" }}\n            ui={SELECTION_UI["select-safe"]}',
    '<Button ui={{ uid: "deploy-runbook.controls.select-safe-mSNY7v", id: "deploy-runbook.controls.select-safe", kind: "action", action: "select-safe", part: "selection" }}',
  ],
  [
    '<Button ui={{ uid: "google-play-console.deploy-runbook-controls.button.4-V38N1W", id: "google-play-console.deploy-runbook-controls.button.4" }}\n            ui={SELECTION_UI["select-dangerous"]}',
    '<Button ui={{ uid: "deploy-runbook.controls.select-dangerous-9fJZtW", id: "deploy-runbook.controls.select-dangerous", kind: "action", action: "select-dangerous", part: "selection" }}',
  ],
];
for (const [before, after] of runbookReplacements) {
  replaceExact("src/features/google-play-console/presentation/DeployRunbookControls.tsx", before, after);
}

unlinkSync("src/features/google-play-console/presentation/deploy-runbook-controls.ui.ts");

console.log("Stage 62 duplicate-UI cleanup batch 1 applied.");
