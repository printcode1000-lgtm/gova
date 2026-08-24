import assert from "node:assert/strict";
import { createCipheriv, randomBytes } from "node:crypto";
import { MobilePushUnlockService } from "../server/services/mobile-push-unlock.service.server";

function encryptBundle(
  bundle: { projectId: string; clientEmail: string; privateKey: string },
  keyHex: string,
): string {
  const key = Buffer.from(keyHex, "hex");
  const iv = randomBytes(12);
  const enc = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    enc.update(JSON.stringify(bundle), "utf8"),
    enc.final(),
  ]);
  return Buffer.concat([iv, enc.getAuthTag(), ciphertext]).toString("base64");
}

async function run(): Promise<void> {
  const keyHex = randomBytes(32).toString("hex");
  process.env.ASOL_MOBILE_PUSH_UNLOCK_KEY = keyHex;
  const bundle = {
    projectId: "asol-prod",
    clientEmail: "firebase@asol.iam.gserviceaccount.com",
    privateKey: "-----BEGIN PRIVATE KEY-----\nLINE\n-----END PRIVATE KEY-----",
  };
  const blob = encryptBundle(bundle, keyHex);
  process.env.ASOL_MOBILE_PUSH_CREDENTIAL_BLOB = blob;

  const users = {
    async execute(uid: string) {
      return uid === "usr_1" ? { uid: "usr_1", phone: "+201000000001" } : null;
    },
  };

  const service = new MobilePushUnlockService(users as never);

  const unlocked = await service.unlock({
    uid: "usr_1",
    phone: "+201000000001",
    credentialBlob: blob,
  });
  assert.deepEqual(unlocked, bundle);

  await assert.rejects(
    () =>
      service.unlock({
        uid: "usr_1",
        phone: "+201000000001",
        credentialBlob: "too-short",
      }),
    /mobilePushCredentialBlobInvalid/,
  );

  await assert.rejects(
    () =>
      service.unlock({
        uid: "usr_2",
        phone: "+201000000001",
        credentialBlob: blob,
      }),
    /forbidden/,
  );

  console.log("mobile-push-unlock.service.test: ok");
}

void run();
