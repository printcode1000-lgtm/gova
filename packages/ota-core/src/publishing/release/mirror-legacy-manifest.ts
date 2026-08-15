import { existsSync } from "node:fs";
import {
  DeleteObjectsCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import { getOtaManifestUrl, getOtaPrefix } from "../config/ota-config";

if (existsSync(".env.local")) dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ path: ".env", quiet: true });

const MIRRORED = ["manifest.json", "revocations.json"] as const;

function requireEnv(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) throw new Error(`${key} is required`);
  return value;
}

export function hasLegacyOtaOrigin(): boolean {
  return Boolean(process.env.ASOL_OTA_LEGACY_R2_ENDPOINT?.trim());
}

function legacyClient(): { client: S3Client; bucket: string; publicUrl: string } {
  return {
    client: new S3Client({
      region: "auto",
      endpoint: requireEnv("ASOL_OTA_LEGACY_R2_ENDPOINT"),
      credentials: {
        accessKeyId: requireEnv("ASOL_OTA_LEGACY_R2_ACCESS_KEY_ID"),
        secretAccessKey: requireEnv("ASOL_OTA_LEGACY_R2_SECRET_ACCESS_KEY"),
      },
      forcePathStyle: true,
      maxAttempts: 4,
      retryMode: "adaptive",
    }),
    bucket: requireEnv("ASOL_OTA_LEGACY_R2_BUCKET_NAME"),
    publicUrl: requireEnv("ASOL_OTA_LEGACY_R2_PUBLIC_URL").replace(/\/$/, ""),
  };
}

export async function mirrorLegacyOtaManifest(remove = false): Promise<void> {
  const { client, bucket, publicUrl } = legacyClient();
  const prefix = getOtaPrefix();

  if (remove) {
    await client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: MIRRORED.map((name) => ({ Key: `${prefix}/${name}` })),
          Quiet: true,
        },
      }),
    );
    console.log(
      `Removed the legacy mirror from ${publicUrl}/${prefix}/.\n` +
        "Every shell built against that origin now gets a 404 on its update check.\n" +
        "Only correct once a store release built against the current origin has\n" +
        "rolled out — an installed release, not merely a published one.",
    );
    return;
  }

  const manifestUrl = getOtaManifestUrl();
  const source = new URL(manifestUrl);

  for (const name of MIRRORED) {
    const from = `${source.origin}${source.pathname.replace(/manifest\.json$/, name)}`;
    const response = await fetch(from, { cache: "no-store" });
    if (!response.ok) {
      if (response.status === 404 && name === "revocations.json") {
        console.log(`  ${name.padEnd(18)} absent at the source, skipped`);
        continue;
      }
      throw new Error(`Cannot read ${from}: ${response.status}`);
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: `${prefix}/${name}`,
        Body: bytes,
        ContentType: "application/json",
        CacheControl: "no-store, max-age=0",
      }),
    );
    console.log(`  ${name.padEnd(18)} mirrored (${bytes.byteLength} bytes)`);
  }

  console.log(
    `\nLegacy origin now answers at ${publicUrl}/${prefix}/manifest.json.\n` +
      "Its baseUrl points at the current origin, so files download from there.\n" +
      "Keep it until a store release built against the current origin has rolled\n" +
      "out. A published release is not an installed one: the device must also pass\n" +
      "approval and rollout before its bundle carries the new URL.",
  );
}
