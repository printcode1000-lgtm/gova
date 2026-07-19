/**
 * Server-only secrets and credentials (Node / build scripts).
 * Next.js app code should import from server-env.ts instead.
 */

import { createPublicKey } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

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

export function getNotificationInternalSecret(): string {
  const secret = process.env.ASOL_NOTIFICATION_INTERNAL_SECRET?.trim();
  if (!secret || secret.length < 32)
    throw new Error("notificationInternalSecretNotConfigured");
  return secret;
}

export function getOtaApprovalServerConfig(): {
  manifestUrl: string;
  publicKey: string;
} {
  const explicitManifestUrl =
    process.env.NEXT_PUBLIC_ASOL_OTA_MANIFEST_URL?.trim();
  const publicBaseUrl = (
    process.env.ASOL_OTA_R2_PUBLIC_URL ||
    process.env.R2_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_R2_PUBLIC_URL ||
    ""
  ).replace(/\/$/, "");
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

export function getTursoProfileRuntimeCredentials(): {
  url: string;
  authToken: string;
} {
  const url = process.env.TURSO_PROFILE_DATABASE_URL;
  const authToken = process.env.TURSO_PROFILE_AUTH_TOKEN;

  if (!url)
    throw new Error(
      "TURSO_PROFILE_DATABASE_URL environment variable is not set",
    );
  if (!authToken)
    throw new Error("TURSO_PROFILE_AUTH_TOKEN environment variable is not set");

  return { url, authToken };
}

export function writeTursoProfileRuntimeCredentials(
  url: string,
  authToken: string,
): void {
  process.env.TURSO_PROFILE_DATABASE_URL = url;
  process.env.TURSO_PROFILE_AUTH_TOKEN = authToken;
}

export function writeTursoMarketplaceOrdersRuntimeCredentials(
  url: string,
  authToken: string,
): void {
  process.env.MARKETPLACE_ORDERS_DATABASE_URL = url;
  process.env.MARKETPLACE_ORDERS_DATABASE_AUTH_TOKEN = authToken;
}

export function getTursoProductRuntimeCredentials(): {
  url: string;
  authToken: string;
} {
  const url =
    process.env.TURSO_PRODUCT_DATABASE_URL || process.env.TURSO_DATABASE_URL;
  const authToken =
    process.env.TURSO_PRODUCT_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;

  if (!url)
    throw new Error(
      "Neither TURSO_PRODUCT_DATABASE_URL nor TURSO_DATABASE_URL is set",
    );
  if (!authToken)
    throw new Error(
      "Neither TURSO_PRODUCT_AUTH_TOKEN nor TURSO_AUTH_TOKEN is set",
    );

  return { url, authToken };
}

export function getTursoAdvertisementsRuntimeCredentials(): {
  url: string;
  authToken: string;
} {
  // Prefer a dedicated advertisements database when configured.
  // Falls back to the main Turso database so that simple deployments only
  // need a single TURSO_DATABASE_URL / TURSO_AUTH_TOKEN pair.
  const url =
    process.env.TURSO_ADVERTISEMENTS_DATABASE_URL ||
    process.env.TURSO_DATABASE_URL;
  const authToken =
    process.env.TURSO_ADVERTISEMENTS_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;

  if (!url)
    throw new Error(
      "Neither TURSO_ADVERTISEMENTS_DATABASE_URL nor TURSO_DATABASE_URL is set",
    );
  if (!authToken)
    throw new Error(
      "Neither TURSO_ADVERTISEMENTS_AUTH_TOKEN nor TURSO_AUTH_TOKEN is set",
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
  return {
    accountId: requireEnv("R2_ACCOUNT_ID"),
    apiToken: requireEnv("R2_API_TOKEN"),
  };
}

export function getR2S3Credentials(): R2S3Credentials {
  const jurisdiction = (readOptionalEnv("R2_JURISDICTION") ??
    "default") as R2S3Credentials["jurisdiction"];
  return {
    accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
    secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
    endpoint: requireEnv("R2_ENDPOINT"),
    bucketName: requireEnv("R2_BUCKET_NAME"),
    location: readOptionalEnv("R2_LOCATION") ?? "WEUR",
    jurisdiction,
  };
}

export function getR2Config(): R2Config {
  return {
    cloudflare: getR2CloudflareCredentials(),
    s3: getR2S3Credentials(),
    publicUrl: requireEnv("R2_PUBLIC_URL"),
    catalogUri: readOptionalEnv("R2_CATALOG_URI") ?? "",
    warehouseName: readOptionalEnv("R2_WAREHOUSE_NAME") ?? "",
  };
}
