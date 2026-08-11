import {
  constants,
  createCipheriv,
  createDecipheriv,
  createHash,
  createPrivateKey,
  generateKeyPairSync,
  privateDecrypt,
  publicEncrypt,
  randomBytes,
} from "node:crypto";
import {
  appendFile,
  copyFile,
  mkdir,
  open,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { createReadStream, createWriteStream, existsSync } from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";

import { WORKSPACE_ROOT } from "./secret-archive-utils";

const MAGIC = Buffer.from("ASOLSECRETS1\n", "ascii");
const AUTH_TAG_LENGTH = 16;
const PRIVATE_KEY_DIRECTORY = path.join(WORKSPACE_ROOT, ".secret-archive");

export const PUBLIC_KEY_PATH = path.join(
  WORKSPACE_ROOT,
  "config",
  "secret-archive-public.pem",
);
export const PRIVATE_KEY_PATH = path.join(
  PRIVATE_KEY_DIRECTORY,
  "private-key.pem",
);

interface EnvelopeHeader {
  version: 1;
  algorithm: "RSA-OAEP-SHA256+A256GCM";
  keyId: string;
  wrappedKey: string;
  iv: string;
}

export async function promptHidden(label: string): Promise<string> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("A real interactive terminal is required for the private-key password.");
  }
  process.stdout.write(label);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");

  return new Promise((resolve, reject) => {
    let value = "";
    const cleanup = () => {
      process.stdin.off("data", onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
    };
    const onData = (chunk: string) => {
      for (const character of chunk) {
        if (character === "\u0003") {
          cleanup();
          process.stdout.write("\n");
          reject(new Error("Password entry cancelled."));
          return;
        }
        if (character === "\r" || character === "\n") {
          cleanup();
          process.stdout.write("\n");
          resolve(value);
          return;
        }
        if (character === "\u007f" || character === "\b") {
          value = value.slice(0, -1);
          continue;
        }
        if (character >= " ") value += character;
      }
    };
    process.stdin.on("data", onData);
  });
}

export async function initializeArchiveKeyPair(): Promise<void> {
  if (existsSync(PUBLIC_KEY_PATH) || existsSync(PRIVATE_KEY_PATH)) {
    throw new Error(
      "The secret archive key pair already exists. Refusing to replace a recovery key.",
    );
  }

  const password = await promptHidden("New private-key password: ");
  if (password.length < 12) {
    throw new Error("The private-key password must contain at least 12 characters.");
  }
  const confirmation = await promptHidden("Confirm private-key password: ");
  if (confirmation !== password) throw new Error("The passwords do not match.");

  const { publicKey, privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 4096,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
      cipher: "aes-256-cbc",
      passphrase: password,
    },
  });

  await mkdir(path.dirname(PUBLIC_KEY_PATH), { recursive: true });
  await mkdir(PRIVATE_KEY_DIRECTORY, { recursive: true });
  await writeFile(PUBLIC_KEY_PATH, publicKey, { flag: "wx", mode: 0o644 });
  await writeFile(PRIVATE_KEY_PATH, privateKey, { flag: "wx", mode: 0o600 });
  console.log(`Public encryption key created: ${PUBLIC_KEY_PATH}`);
  console.log(`Encrypted recovery key created: ${PRIVATE_KEY_PATH}`);
}

function publicKeyId(publicKey: Buffer): string {
  return createHash("sha256").update(publicKey).digest("hex");
}

export async function encryptZipWithPublicKey(
  zipPath: string,
  encryptedPath: string,
): Promise<void> {
  if (!existsSync(PUBLIC_KEY_PATH)) {
    throw new Error("Public key missing. Run npm run secrets:key:init once first.");
  }
  if (!existsSync(PRIVATE_KEY_PATH)) {
    throw new Error("Encrypted private key missing; refusing to create an unrecoverable archive.");
  }

  const publicKey = await readFile(PUBLIC_KEY_PATH);
  const contentKey = randomBytes(32);
  const iv = randomBytes(12);
  const wrappedKey = publicEncrypt(
    {
      key: publicKey,
      padding: constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    contentKey,
  );
  const header: EnvelopeHeader = {
    version: 1,
    algorithm: "RSA-OAEP-SHA256+A256GCM",
    keyId: publicKeyId(publicKey),
    wrappedKey: wrappedKey.toString("base64"),
    iv: iv.toString("base64"),
  };
  const headerBytes = Buffer.from(JSON.stringify(header), "utf8");
  const headerLength = Buffer.alloc(4);
  headerLength.writeUInt32BE(headerBytes.length);
  const cipherPath = `${encryptedPath}.cipher.tmp`;
  const cipher = createCipheriv("aes-256-gcm", contentKey, iv);

  try {
    await pipeline(
      createReadStream(zipPath),
      cipher,
      createWriteStream(cipherPath, { flags: "wx", mode: 0o600 }),
    );
    const authTag = cipher.getAuthTag();
    await writeFile(
      encryptedPath,
      Buffer.concat([MAGIC, headerLength, headerBytes]),
      { flag: "wx", mode: 0o600 },
    );
    await pipeline(
      createReadStream(cipherPath),
      createWriteStream(encryptedPath, { flags: "a" }),
    );
    await appendFile(encryptedPath, authTag);
  } catch (error) {
    await rm(encryptedPath, { force: true });
    throw error;
  } finally {
    await rm(cipherPath, { force: true });
  }
}

async function readEnvelopeHeader(encryptedPath: string): Promise<{
  header: EnvelopeHeader;
  ciphertextStart: number;
  ciphertextEnd: number;
  authTag: Buffer;
}> {
  const file = await open(encryptedPath, "r");
  try {
    const prefix = Buffer.alloc(MAGIC.length + 4);
    await file.read(prefix, 0, prefix.length, 0);
    if (!prefix.subarray(0, MAGIC.length).equals(MAGIC)) {
      throw new Error("This is not an ASOL encrypted secret archive.");
    }
    const headerLength = prefix.readUInt32BE(MAGIC.length);
    if (headerLength <= 0 || headerLength > 64 * 1024) {
      throw new Error("Invalid encrypted archive header.");
    }
    const headerBytes = Buffer.alloc(headerLength);
    await file.read(headerBytes, 0, headerLength, prefix.length);
    const header = JSON.parse(headerBytes.toString("utf8")) as EnvelopeHeader;
    if (header.version !== 1 || header.algorithm !== "RSA-OAEP-SHA256+A256GCM") {
      throw new Error("Unsupported encrypted archive version.");
    }
    const fileSize = (await stat(encryptedPath)).size;
    const ciphertextStart = prefix.length + headerLength;
    const ciphertextEnd = fileSize - AUTH_TAG_LENGTH - 1;
    if (ciphertextEnd < ciphertextStart) throw new Error("Encrypted archive is truncated.");
    const authTag = Buffer.alloc(AUTH_TAG_LENGTH);
    await file.read(authTag, 0, AUTH_TAG_LENGTH, fileSize - AUTH_TAG_LENGTH);
    return { header, ciphertextStart, ciphertextEnd, authTag };
  } finally {
    await file.close();
  }
}

export async function decryptArchiveToZip(
  encryptedPath: string,
  zipPath: string,
  password: string,
): Promise<void> {
  const sidecarPrivateKey = `${encryptedPath}.private-key.pem`;
  const privateKeyPath = existsSync(sidecarPrivateKey)
    ? sidecarPrivateKey
    : PRIVATE_KEY_PATH;
  if (!existsSync(privateKeyPath)) {
    throw new Error(
      `Encrypted recovery key missing. Expected ${sidecarPrivateKey} or ${PRIVATE_KEY_PATH}.`,
    );
  }

  const privateKey = createPrivateKey({
    key: await readFile(privateKeyPath),
    format: "pem",
    passphrase: password,
  });
  const { header, ciphertextStart, ciphertextEnd, authTag } =
    await readEnvelopeHeader(encryptedPath);
  const contentKey = privateDecrypt(
    {
      key: privateKey,
      padding: constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    Buffer.from(header.wrappedKey, "base64"),
  );
  const decipher = createDecipheriv(
    "aes-256-gcm",
    contentKey,
    Buffer.from(header.iv, "base64"),
  );
  decipher.setAuthTag(authTag);

  try {
    await pipeline(
      createReadStream(encryptedPath, {
        start: ciphertextStart,
        end: ciphertextEnd,
      }),
      decipher,
      createWriteStream(zipPath, { flags: "wx", mode: 0o600 }),
    );
  } catch (error) {
    await rm(zipPath, { force: true });
    throw new Error(
      `Could not decrypt the archive. The password or recovery key is incorrect. ${error instanceof Error ? error.message : ""}`.trim(),
    );
  }
}

export async function copyRecoveryKeyBesideArchive(
  encryptedPath: string,
): Promise<string> {
  const destination = `${encryptedPath}.private-key.pem`;
  await copyFile(PRIVATE_KEY_PATH, destination);
  return destination;
}
