import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

function testPublicEnvExposesBlobOnly(): void {
  const source = readFileSync(
    path.join(repoRoot, "src/core/config/public-env.ts"),
    "utf8",
  );
  assert.match(source, /mobilePushCredentialBlob/);
  assert.match(source, /NEXT_PUBLIC_ASOL_MOBILE_PUSH_CREDENTIAL_BLOB/);
  assert.doesNotMatch(source, /ASOL_MOBILE_PUSH_UNLOCK_KEY/);
}

function testUnlockUsesClientBlob(): void {
  const source = readFileSync(
    path.join(
      repoRoot,
      "src/features/notifications/server/services/mobile-push-unlock.service.server.ts",
    ),
    "utf8",
  );
  assert.match(source, /input\.credentialBlob/);
  assert.match(source, /decryptMobilePushCredentialBlob\(blob\)/);
}

function testApiRoutesWired(): void {
  const recipientRoute = readFileSync(
    path.join(repoRoot, "src/app/api/notifications/recipient-tokens/route.ts"),
    "utf8",
  );
  const unlockRoute = readFileSync(
    path.join(repoRoot, "src/app/api/notifications/mobile-push/unlock/route.ts"),
    "utf8",
  );
  assert.match(recipientRoute, /resolveRecipientTokensForGrants/);
  assert.match(unlockRoute, /credentialBlob/);

  // Both routes hand a native sender delivery material — a Firebase Admin key
  // and push tokens — so the caller is the verified session on every origin
  // that serves them, never a guessable uid/phone pair read from the body.
  const submainRecipientRoute = readFileSync(
    path.join(repoRoot, "services/submain/src/app/api/notifications/recipient-tokens/route.ts"),
    "utf8",
  );
  const submainUnlockRoute = readFileSync(
    path.join(repoRoot, "services/submain/src/app/api/notifications/mobile-push/unlock/route.ts"),
    "utf8",
  );
  for (const route of [recipientRoute, unlockRoute]) {
    assert.match(route, /assertSignedInRequest\(request\)/);
    assert.match(route, /uid: claims\.uid,\s*phone: claims\.phone/);
  }
  for (const route of [submainRecipientRoute, submainUnlockRoute]) {
    assert.match(route, /account\.assertSignedIn\(request\)/);
    assert.match(route, /uid: claims\.uid,\s*phone: claims\.phone/);
  }

  // The native sender carries the session and no identity in the body.
  const sessionRoute = readFileSync(
    path.join(repoRoot, "packages/account-bridge/src/mobile-push/session-route.ts"),
    "utf8",
  );
  assert.match(sessionRoute, /'x-asol-session-token': sessionToken/);
  for (const file of ["enrollment.ts", "deliver.ts"]) {
    const source = readFileSync(
      path.join(repoRoot, "packages/account-bridge/src/mobile-push", file),
      "utf8",
    );
    assert.match(source, /postSessionRoute\(/);
    assert.doesNotMatch(source, /\.\.\.(identity|input),/);
  }
}

function testNativeBranchInBridge(): void {
  const source = readFileSync(
    path.join(repoRoot, "packages/account-bridge/src/notifications.ts"),
    "utf8",
  );
  assert.match(source, /isNativePlatform\(\)/);
  assert.match(source, /deliverNotificationGrantsFromNative/);
}

console.log("mobile-push-contract.test: ok");
