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
