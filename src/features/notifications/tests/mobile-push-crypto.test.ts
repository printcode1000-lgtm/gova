import { createCipheriv, randomBytes } from "node:crypto";
import {
  decryptMobilePushCredentialBlob,
  type MobilePushCredentialBundle,
} from "../server/services/mobile-push-crypto.server";

function encrypt(bundle: MobilePushCredentialBundle, key: Buffer): string {
  const iv = randomBytes(12);
  const enc = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    enc.update(JSON.stringify(bundle), "utf8"),
    enc.final(),
  ]);
  return Buffer.concat([iv, enc.getAuthTag(), ciphertext]).toString("base64");
}

async function run(): Promise<void> {
  const key = randomBytes(32);
  const keyHex = key.toString("hex");
  process.env.ASOL_MOBILE_PUSH_UNLOCK_KEY = keyHex;

  const bundle: MobilePushCredentialBundle = {
    projectId: "asol-test",
    clientEmail: "firebase@test.iam.gserviceaccount.com",
    privateKey: "-----BEGIN PRIVATE KEY-----\nTEST\n-----END PRIVATE KEY-----",
  };
  const blob = encrypt(bundle, key);
  const decrypted = decryptMobilePushCredentialBlob(blob);
  if (decrypted.projectId !== bundle.projectId) {
    throw new Error("mobile push decrypt projectId mismatch");
  }
  if (decrypted.clientEmail !== bundle.clientEmail) {
    throw new Error("mobile push decrypt clientEmail mismatch");
  }
  console.log("mobile-push-crypto.test: ok");
}

void run();
