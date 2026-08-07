/**
 * Mirrors `manifest.json` and `revocations.json` to a legacy OTA origin.
 *
 * The manifest URL is inlined into the web bundle at static build time, so a
 * shell already installed on a device asks the origin it was built with. Moving
 * OTA to a different bucket therefore strands every installed copy with a 404 —
 * the release is fine, the address it knows is not.
 *
 * The bundle downloads its files from `manifest.baseUrl`, which the manifest
 * itself carries, so mirroring the two small JSON documents is enough: the old
 * shell reads them from the old origin and fetches everything else from the new
 * one. The bytes are copied verbatim, so the signature the client verifies is
 * the same signature the publisher produced.
 *
 * This heals itself. The mirrored release's bundle has the new URL inlined, so
 * once a device installs it, it never asks the legacy origin again. Delete the
 * mirror afterwards with `--remove`.
 *
 * Usage:
 *   npx tsx scripts/ota/ota-mirror-legacy-manifest.ts
 *   npx tsx scripts/ota/ota-mirror-legacy-manifest.ts --remove
 */
import { existsSync } from "node:fs";
import {
  DeleteObjectsCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import { getOtaManifestUrl, getOtaPrefix } from "./ota-config";

if (existsSync(".env.local")) dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ path: ".env", quiet: true });

const MIRRORED = ["manifest.json", "revocations.json"] as const;

function requireEnv(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) throw new Error(`${key} is required`);
  return value;
}

/**
 * The legacy origin, named explicitly.
 *
 * Deliberately not derived from `PRODUCT_R2_*`: OTA reading a product variable
 * is the exact coupling that put 3,463 release objects on the product account.
 * This script writes two documents to an address the caller states outright.
 */
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

async function main(): Promise<void> {
  const remove = process.argv.slice(2).includes("--remove");
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
      `Removed the legacy mirror from ${publicUrl}/${prefix}/. Shells still on ` +
        "the old origin will 404 again — only do this once they have updated.",
    );
    return;
  }

  const manifestUrl = getOtaManifestUrl();
  const source = new URL(manifestUrl);

  for (const name of MIRRORED) {
    const from = `${source.origin}${source.pathname.replace(/manifest\.json$/, name)}`;
    const response = await fetch(from, { cache: "no-store" });
    if (!response.ok) {
      // revocations.json is absent until something is revoked; that is normal.
      if (response.status === 404 && name === "revocations.json") {
        console.log(`  ${name.padEnd(18)} absent at the source, skipped`);
        continue;
      }
      throw new Error(`Cannot read ${from}: ${response.status}`);
    }
    // Byte-for-byte: the signature the device verifies must be the one the
    // publisher signed, so the body is passed through untouched.
    const bytes = Buffer.from(await response.arrayBuffer());
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: `${prefix}/${name}`,
        Body: bytes,
        // Matches the publisher: CapacitorHttp parses application/json before
        // honouring arraybuffer, which destroys the bytes the client hashes.
        ContentType: "application/octet-stream",
        CacheControl: "no-store",
      }),
    );
    console.log(`  ${name.padEnd(18)} mirrored (${bytes.byteLength} bytes)`);
  }

  console.log(
    `\nLegacy origin now answers at ${publicUrl}/${prefix}/manifest.json.\n` +
      "Its baseUrl points at the current origin, so files download from there.\n" +
      "Remove the mirror with --remove once the installed shells have updated.",
  );
}

void main();
