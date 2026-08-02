import "server-only";

import fs from "node:fs/promises";
import path from "node:path";

import type { JWTInput } from "google-auth-library";

import {
  resolveGooglePlayConsoleConfig,
  resolveGooglePlayServiceAccountEnvironment,
} from "../domain/development-guard.server";

export interface GooglePlayCredentialStatus {
  keyFilePath: string;
  keyFileExists: boolean;
  source: "environment" | "file" | "missing";
  serviceAccountEmail: string;
  serviceAccountProjectId: string;
  serviceAccountUniqueId: string;
}

function decodeServiceAccountFromEnvironment(): JWTInput | null {
  const env = resolveGooglePlayServiceAccountEnvironment();
  if (env.jsonBase64) {
    return JSON.parse(Buffer.from(env.jsonBase64, "base64").toString("utf8")) as JWTInput;
  }

  if (!env.privateKeyBase64 || !env.clientEmail) return null;

  return {
    type: env.type,
    project_id: env.projectId,
    private_key_id: env.privateKeyId,
    private_key: Buffer.from(env.privateKeyBase64, "base64").toString("utf8"),
    client_email: env.clientEmail,
    client_id: env.clientId,
    auth_uri: env.authUri,
    token_uri: env.tokenUri,
    auth_provider_x509_cert_url: env.authProviderX509CertUrl,
    client_x509_cert_url: env.clientX509CertUrl,
    universe_domain: env.universeDomain,
  } as JWTInput;
}

export async function resolveGooglePlayCredentials() {
  const config = resolveGooglePlayConsoleConfig();
  const fromEnv = decodeServiceAccountFromEnvironment();
  if (fromEnv) {
    return {
      credentials: fromEnv,
      status: toStatus(config.keyFilePath, false, "environment", fromEnv),
    };
  }

  const keyFileExists = await fs
    .access(config.keyFilePath)
    .then(() => true)
    .catch(() => false);

  if (!keyFileExists) {
    return {
      credentials: null,
      status: toStatus(config.keyFilePath, false, "missing", {}),
    };
  }

  const parsed = JSON.parse(
    await fs.readFile(config.keyFilePath, "utf8"),
  ) as JWTInput;
  return {
    credentials: parsed,
    status: toStatus(config.keyFilePath, true, "file", parsed),
  };
}

function toStatus(
  keyFilePath: string,
  keyFileExists: boolean,
  source: GooglePlayCredentialStatus["source"],
  credentials: Partial<JWTInput>,
): GooglePlayCredentialStatus {
  return {
    keyFilePath: path.relative(process.cwd(), keyFilePath),
    keyFileExists,
    source,
    serviceAccountEmail: credentials.client_email ?? "",
    serviceAccountProjectId: credentials.project_id ?? "",
    serviceAccountUniqueId: credentials.client_id ?? "",
  };
}
