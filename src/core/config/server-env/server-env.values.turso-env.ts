import { createPublicKey } from "node:crypto";
import { readListEnv, readOptionalEnv, requireEnv } from "@asol/env-core";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";


export function getTursoRuntimeCredentials(): {
  url: string;
  authToken: string;
} {
  return {
    url: requireEnv("TURSO_DATABASE_URL"),
    authToken: requireEnv("TURSO_AUTH_TOKEN"),
  };
}

export function getTursoPlatformCredentials(): {
  apiToken: string;
  organization: string;
} {
  return {
    apiToken: requireEnv("TURSO_API_TOKEN"),
    organization: requireEnv("TURSO_ORGANIZATION"),
  };
}

export function getCorsOrigins(): string[] {
  const fromEnv = readListEnv("ASOL_CORS_ORIGINS");
  if (fromEnv.length) return fromEnv;

  return [
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "capacitor://localhost",
    "https://localhost",
    "http://localhost",
    "ionic://localhost",
  ];
}

export { readOptionalEnv };

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

export function getWebPushServerConfig(): { privateKey: string } | null {
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY?.trim() ?? "";
  if (!privateKey) return null;
  return { privateKey };
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

export function getNotificationGrantSecret(): string {
  const grantSecret = process.env.ASOL_NOTIFICATION_GRANT_SECRET?.trim() ?? "";
  if (grantSecret.length >= 32) return grantSecret;

  const sessionSecret = process.env.ASOL_SESSION_SIGNING_SECRET?.trim() ?? "";
  if (sessionSecret.length >= 32) return sessionSecret;

  throw new Error("notificationGrantSecretNotConfigured");
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
