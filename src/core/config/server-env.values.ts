/**
 * Server-only secrets and credentials (Node / build scripts).
 * Next.js app code should import from server-env.ts instead.
 */

import { createPublicKey } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  assertR2StorageTarget,
  assertR2StorageTargetFields,
} from "./r2-storage-topology";

export function getTursoRuntimeCredentials(): {
  url: string;
  authToken: string;
} {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url)
    throw new Error("TURSO_DATABASE_URL environment variable is not set");
  if (!authToken)
    throw new Error("TURSO_AUTH_TOKEN environment variable is not set");

  return { url, authToken };
}

export function getTursoPlatformCredentials(): {
  apiToken: string;
  organization: string;
} {
  const apiToken = process.env.TURSO_API_TOKEN;
  const organization = process.env.TURSO_ORGANIZATION;

  if (!apiToken)
    throw new Error("TURSO_API_TOKEN is required for Turso provisioning");
  if (!organization)
    throw new Error("TURSO_ORGANIZATION is required for Turso provisioning");

  return { apiToken, organization };
}

export function getCorsOrigins(): string[] {
  const fromEnv = process.env.ASOL_CORS_ORIGINS?.split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  if (fromEnv?.length) return fromEnv;

  return [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "capacitor://localhost",
    "https://localhost",
    "http://localhost",
    "ionic://localhost",
  ];
}

export function readOptionalEnv(key: string): string | undefined {
  return process.env[key];
}

export function getAppLinkAssociationConfig(): {
  androidCertificateFingerprints: string[];
  iosTeamId: string;
  iosBundleId: string;
} {
  return {
    androidCertificateFingerprints: (
      process.env.ASOL_ANDROID_APP_LINK_CERT_SHA256 ?? ""
    )
      .split(/[;,]/)
      .map((value) => value.trim())
      .filter(Boolean),
    iosTeamId: process.env.ASOL_IOS_TEAM_ID?.trim() ?? "",
    iosBundleId: process.env.ASOL_IOS_BUNDLE_ID?.trim() || "hgh.asol.app",
  };
}

/**
 * Names of every configured libsql database URL variable.
 * Lets callers cover all databases without hardcoding a list that can drift.
 */
export function listLibsqlDatabaseUrlKeys(): string[] {
  return Object.keys(process.env)
    .filter(
      (key) =>
        key.endsWith("_DATABASE_URL") &&
        (process.env[key] ?? "").trim().startsWith("libsql://"),
    )
    .sort();
}

export function getPasswordRecoveryConfig(): {
  gmailUser: string;
  gmailAppPassword: string;
  signingSecret: string;
} {
  const gmailUser = process.env.PASSWORD_RECOVERY_GMAIL_USER?.trim();
  const gmailAppPassword =
    process.env.PASSWORD_RECOVERY_GMAIL_APP_PASSWORD?.replace(/\s+/g, "");
  const signingSecret = process.env.PASSWORD_RECOVERY_SIGNING_SECRET?.trim();

  if (!gmailUser || !gmailAppPassword || !signingSecret) {
    throw new Error("passwordRecoveryNotConfigured");
  }

  return { gmailUser, gmailAppPassword, signingSecret };
}

export interface FirebaseAdminServiceAccountConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

export function getFirebaseAdminServiceAccount(): FirebaseAdminServiceAccountConfig {
  const encoded = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64?.trim();
  const inline = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON?.trim();
  const raw = encoded
    ? Buffer.from(encoded, "base64").toString("utf8")
    : inline || "";

  if (!raw) throw new Error("firebaseAdminNotConfigured");
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error("firebaseAdminInvalidJson");
  }

  const projectId =
    typeof parsed.project_id === "string" ? parsed.project_id.trim() : "";
  const clientEmail =
    typeof parsed.client_email === "string" ? parsed.client_email.trim() : "";
  const privateKey =
    typeof parsed.private_key === "string"
      ? parsed.private_key.replace(/\\n/g, "\n")
      : "";
  if (projectId !== "asole-73f1f" || !clientEmail || !privateKey) {
    throw new Error("firebaseAdminInvalidCredentials");
  }
  return { projectId, clientEmail, privateKey };
}

/**
 * Session signing.
 *
 * One source, no fallbacks. It used to fall back to the notification secret and
 * then to the database token — so a deployment could sign sessions with a
 * credential it never meant to use, and rotating that credential would log
 * everybody out for reasons nobody could trace. Missing configuration now fails
 * loudly instead.
 */
export function getAsolSessionSigningSecret(): string {
  const secret = process.env.ASOL_SESSION_SIGNING_SECRET?.trim() ?? "";
  if (secret.length < 32) throw new Error("sessionSigningSecretNotConfigured");
  return secret;
}

export function getApnsServerConfig(): {
  teamId: string;
  keyId: string;
  bundleId: string;
  privateKey: string;
  production: boolean;
} | null {
  const teamId = process.env.APNS_TEAM_ID?.trim() ?? "";
  const keyId = process.env.APNS_KEY_ID?.trim() ?? "";
  const bundleId = process.env.APNS_BUNDLE_ID?.trim() || "hgh.asol.app";
  const privateKey = (process.env.APNS_PRIVATE_KEY ?? "")
    .replace(/\\n/g, "\n")
    .trim();
  if (!teamId || !keyId || !privateKey) return null;
  return {
    teamId,
    keyId,
    bundleId,
    privateKey,
    production: process.env.APNS_PRODUCTION?.trim().toLowerCase() === "true",
  };
}

export function getOtaApprovalServerConfig(): {
  manifestUrl: string;
  publicKey: string;
} {
  const explicitManifestUrl =
    process.env.NEXT_PUBLIC_ASOL_OTA_MANIFEST_URL?.trim();
  // ASOL_OTA_R2_PUBLIC_URL only. Falling back to the product or general bucket
  // would point clients at a manifest on an account that OTA does not own.
  const publicBaseUrl = (process.env.ASOL_OTA_R2_PUBLIC_URL || "").replace(
    /\/$/,
    "",
  );
  const prefix = (process.env.ASOL_OTA_R2_PREFIX || "app-updates").replace(
    /^\/+|\/+$/g,
    "",
  );
  const manifestUrl =
    explicitManifestUrl ||
    (publicBaseUrl ? `${publicBaseUrl}/${prefix}/manifest.json` : "");

  let publicKey = (
    process.env.ASOL_OTA_PUBLIC_KEY ||
    process.env.NEXT_PUBLIC_ASOL_OTA_PUBLIC_KEY ||
    ""
  ).trim();
  if (!publicKey) {
    const localPublicKeyPath = path.resolve(".ota", "public-key.pem");
    if (existsSync(localPublicKeyPath)) {
      publicKey = createPublicKey(readFileSync(localPublicKeyPath))
        .export({ format: "der", type: "spki" })
        .toString("base64");
    }
  }
  if (!publicKey) {
    const privateKey = process.env.ASOL_OTA_SIGNING_PRIVATE_KEY?.replace(
      /\\n/g,
      "\n",
    );
    const localPrivateKeyPath = path.resolve(".ota", "private-key.pem");
    const source =
      privateKey ||
      (existsSync(localPrivateKeyPath)
        ? readFileSync(localPrivateKeyPath)
        : null);
    if (source) {
      publicKey = createPublicKey(source)
        .export({ format: "der", type: "spki" })
        .toString("base64");
    }
  }

  if (!manifestUrl || !publicKey) throw new Error("otaNotConfigured");
  return { manifestUrl, publicKey };
}

export function writeTursoRuntimeCredentials(
  url: string,
  authToken: string,
): void {
  process.env.TURSO_DATABASE_URL = url;
  process.env.TURSO_AUTH_TOKEN = authToken;
}

export function writeTursoProductRuntimeCredentials(
  url: string,
  authToken: string,
): void {
  process.env.TURSO_PRODUCT_DATABASE_URL = url;
  process.env.TURSO_PRODUCT_AUTH_TOKEN = authToken;
}

export function writeTursoAdvertisementsRuntimeCredentials(
  url: string,
  authToken: string,
): void {
  process.env.TURSO_ADVERTISEMENTS_DATABASE_URL = url;
  process.env.TURSO_ADVERTISEMENTS_AUTH_TOKEN = authToken;
}

export function getTursoProductRuntimeCredentials(): {
  url: string;
  authToken: string;
} {
  const url = process.env.TURSO_PRODUCT_DATABASE_URL;
  const authToken = process.env.TURSO_PRODUCT_AUTH_TOKEN;

  if (!url)
    throw new Error(
      "TURSO_PRODUCT_DATABASE_URL environment variable is not set",
    );
  if (!authToken)
    throw new Error("TURSO_PRODUCT_AUTH_TOKEN environment variable is not set");

  return { url, authToken };
}

export function writeTursoNotificationsRuntimeCredentials(
  url: string,
  authToken: string,
): void {
  process.env.TURSO_NOTIFICATIONS_DATABASE_URL = url;
  process.env.TURSO_NOTIFICATIONS_AUTH_TOKEN = authToken;
}

/**
 * The notifications database lives in its own Turso account, so it never falls
 * back to the users credentials. A missing value is a misconfiguration, not a
 * reason to write push tokens into the users database.
 */
export function getTursoNotificationsRuntimeCredentials(): {
  url: string;
  authToken: string;
} {
  const url = process.env.TURSO_NOTIFICATIONS_DATABASE_URL;
  const authToken = process.env.TURSO_NOTIFICATIONS_AUTH_TOKEN;

  if (!url)
    throw new Error(
      "TURSO_NOTIFICATIONS_DATABASE_URL environment variable is not set",
    );
  if (!authToken)
    throw new Error(
      "TURSO_NOTIFICATIONS_AUTH_TOKEN environment variable is not set",
    );

  return { url, authToken };
}

/**
 * Shared trust anchor between the two deployments.
 *
 * The main app signs a notification grant with it; the notifications service
 * verifies the signature. It is the *only* thing the two share — neither calls
 * the other, and the browser carries the grant between them. A grant is
 * therefore worth exactly one pre-authorised send, and a browser holding one
 * cannot alter who it reaches or what it says.
 *
 * One source, no fallbacks. Falling back to the session signing secret would
 * mean the two accounts could silently agree on a *different* key than the one
 * configured, and a mismatch would then surface as forged-grant rejections with
 * nothing to point at. Missing configuration fails loudly instead.
 */
export function getNotificationGrantSecret(): string {
  const secret = process.env.ASOL_NOTIFICATION_GRANT_SECRET?.trim() ?? "";
  if (secret.length < 32)
    throw new Error("notificationGrantSecretNotConfigured");
  return secret;
}

export function getTursoAdvertisementsRuntimeCredentials(): {
  url: string;
  authToken: string;
} {
  const url = process.env.TURSO_ADVERTISEMENTS_DATABASE_URL;
  const authToken = process.env.TURSO_ADVERTISEMENTS_AUTH_TOKEN;

  if (!url)
    throw new Error(
      "TURSO_ADVERTISEMENTS_DATABASE_URL environment variable is not set",
    );
  if (!authToken)
    throw new Error(
      "TURSO_ADVERTISEMENTS_AUTH_TOKEN environment variable is not set",
    );

  return { url, authToken };
}

export interface R2CloudflareCredentials {
  accountId: string;
  apiToken: string;
}

export interface R2S3Credentials {
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string;
  bucketName: string;
  location: string;
  jurisdiction: "default" | "eu" | "fedramp";
}

export interface R2Config {
  cloudflare: R2CloudflareCredentials;
  s3: R2S3Credentials;
  publicUrl: string;
  catalogUri: string;
  warehouseName: string;
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`${key} environment variable is not set`);
  return value;
}

export function getR2CloudflareCredentials(): R2CloudflareCredentials {
  const credentials = {
    accountId: requireEnv("R2_ACCOUNT_ID"),
    apiToken: requireEnv("R2_API_TOKEN"),
  };
  assertR2StorageTargetFields("general", {
    accountId: credentials.accountId,
  });
  return credentials;
}

export function getR2S3Credentials(): R2S3Credentials {
  const jurisdiction = (readOptionalEnv("R2_JURISDICTION") ??
    "default") as R2S3Credentials["jurisdiction"];
  const credentials = {
    accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
    secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
    endpoint: requireEnv("R2_ENDPOINT"),
    bucketName: requireEnv("R2_BUCKET_NAME"),
    location: readOptionalEnv("R2_LOCATION") ?? "WEUR",
    jurisdiction,
  };
  assertR2StorageTargetFields("general", credentials);
  return credentials;
}

/**
 * The bucket's public base URL, on its own.
 *
 * Turning a stored key into a URL is a pure string operation, and reading an
 * object needs only the S3 credentials. Neither needs `R2_API_TOKEN`, which is
 * an account-management credential — bucket creation, CORS policy. Deployments
 * that only read images therefore never hold it: the profiles service resolves
 * avatars with nothing but this value and the S3 pair.
 */
export function getR2PublicUrl(): string {
  return requireEnv("R2_PUBLIC_URL");
}

export function getR2Config(): R2Config {
  const cloudflare = getR2CloudflareCredentials();
  const s3 = getR2S3Credentials();
  const config = {
    cloudflare,
    s3,
    publicUrl: requireEnv("R2_PUBLIC_URL"),
    catalogUri: readOptionalEnv("R2_CATALOG_URI") ?? "",
    warehouseName: readOptionalEnv("R2_WAREHOUSE_NAME") ?? "",
  };
  assertR2StorageTarget("general", {
    accountId: cloudflare.accountId,
    endpoint: s3.endpoint,
    bucketName: s3.bucketName,
    publicUrl: config.publicUrl,
    location: s3.location,
    jurisdiction: s3.jurisdiction,
  });
  return config;
}

export function getProductR2CloudflareCredentials(): R2CloudflareCredentials {
  const credentials = {
    accountId: requireEnv("PRODUCT_R2_ACCOUNT_ID"),
    apiToken: requireEnv("PRODUCT_R2_API_TOKEN"),
  };
  assertR2StorageTargetFields("products", {
    accountId: credentials.accountId,
  });
  return credentials;
}

export function getProductR2S3Credentials(): R2S3Credentials {
  const jurisdiction = (readOptionalEnv("PRODUCT_R2_JURISDICTION") ??
    "default") as R2S3Credentials["jurisdiction"];
  const credentials = {
    accessKeyId: requireEnv("PRODUCT_R2_ACCESS_KEY_ID"),
    secretAccessKey: requireEnv("PRODUCT_R2_SECRET_ACCESS_KEY"),
    endpoint: requireEnv("PRODUCT_R2_ENDPOINT"),
    bucketName: requireEnv("PRODUCT_R2_BUCKET_NAME"),
    location: readOptionalEnv("PRODUCT_R2_LOCATION") ?? "WEUR",
    jurisdiction,
  };
  assertR2StorageTargetFields("products", credentials);
  return credentials;
}

/** The product bucket's public base URL, on its own — see {@link getR2PublicUrl}. */
export function getProductR2PublicUrl(): string {
  return requireEnv("PRODUCT_R2_PUBLIC_URL");
}

export function getProductR2Config(): R2Config {
  const cloudflare = getProductR2CloudflareCredentials();
  const s3 = getProductR2S3Credentials();
  const config = {
    cloudflare,
    s3,
    publicUrl: requireEnv("PRODUCT_R2_PUBLIC_URL"),
    catalogUri: readOptionalEnv("PRODUCT_R2_CATALOG_URI") ?? "",
    warehouseName: readOptionalEnv("PRODUCT_R2_WAREHOUSE_NAME") ?? "",
  };
  assertR2StorageTarget("products", {
    accountId: cloudflare.accountId,
    endpoint: s3.endpoint,
    bucketName: s3.bucketName,
    publicUrl: config.publicUrl,
    location: s3.location,
    jurisdiction: s3.jurisdiction,
  });
  return config;
}
