import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  createSignedSessionToken,
  verifySignedSessionToken,
} from "@/features/auth/services/signed-session-token.server";
import {
  createSpecialtyChatCapability,
  verifySpecialtyChatCapability,
} from "../services/specialty-chat-capability.server";

const session = createSignedSessionToken("buyer", "01000000000");
assert.equal(verifySignedSessionToken(session).uid, "buyer");
assert.throws(() => verifySignedSessionToken(`${session}x`), /sessionTokenInvalid/);

const capability = createSpecialtyChatCapability({
  requestId: "req_12345678",
  buyerUid: "buyer",
  sellerUid: "seller",
});
assert.equal(verifySpecialtyChatCapability(capability).sellerUid, "seller");
assert.throws(
  () => verifySpecialtyChatCapability(`${capability}x`),
  /specialtyChatCapabilityInvalid/,
);
const expired = createSpecialtyChatCapability({
  requestId: "req_87654321",
  buyerUid: "buyer",
  sellerUid: "seller",
  expiresAt: Date.now() - 1,
});
assert.throws(() => verifySpecialtyChatCapability(expired), /specialtyChatCapabilityExpired/);

const serviceSource = readFileSync(
  path.join(process.cwd(), "src/features/specialty-chat/services/specialty-chat-service.server.ts"),
  "utf8",
);
const clientSource = readFileSync(
  path.join(process.cwd(), "src/features/specialty-chat/application/specialty-chat-client.ts"),
  "utf8",
);
const settingsSource = readFileSync(
  path.join(process.cwd(), "src/components/settings/SettingsPageContent.tsx"),
  "utf8",
);
const notificationSchemaSource = readFileSync(
  path.join(
    process.cwd(),
    "src/modules/data-access/core/database/notifications/notifications.schema.ts",
  ),
  "utf8",
);
const unifiedPreferenceRoute = path.join(
  process.cwd(),
  "src/app/api/specialty-chat/preferences/route.ts",
);
assert.match(serviceSource, /productService\.get\(input\.productId\.trim\(\)\)/);
assert.match(serviceSource, /product\.uid !== sellerUid/);
assert.match(serviceSource, /createSpecialtyChatCapability\(/);
assert.match(clientSource, /conversationKey: `chat:conversation:/);
assert.match(clientSource, /await saveOutgoing\(/);
assert.match(serviceSource, /sellerPreferences\?\.productConversationsEnabled/);
assert.match(serviceSource, /SPECIALTY_CHAT_KINDS\.ProductRequest/);
assert.match(clientSource, /SPECIALTY_CHAT_KINDS\.ProductRequest/);
assert.match(clientSource, /\/api\/specialty-chat\/preferences/);
assert.doesNotMatch(clientSource, /productConversationPreference|\.preference\(/);
assert.equal(existsSync(unifiedPreferenceRoute), true);
assert.equal(
  existsSync(path.join(process.cwd(), "src/app/api/specialty-chat/preference/route.ts")),
  false,
);
assert.equal(
  existsSync(
    path.join(process.cwd(), "src/app/api/specialty-chat/product-preference/route.ts"),
  ),
  false,
);
assert.match(settingsSource, /مراسلة صاحب المنتج/);
assert.match(settingsSource, /updateProductConversations/);
assert.match(notificationSchemaSource, /productConversationsEnabled/);

console.log("Specialty chat signature tests passed.");
