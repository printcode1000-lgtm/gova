import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { GoogleAuth, type JWTInput } from "google-auth-library";
import { androidVersionNameFromCode } from "../../domain/versioning/native-version";

const DEFAULT_PACKAGE_NAME = "hgh.asol.app";
const DEFAULT_KEY_FILE = "assets/google-play/asole-73f1f-dc494a4b5159.json";
const ANDROID_PUBLISHER_SCOPE = "https://www.googleapis.com/auth/androidpublisher";
const API_ROOT = "https://androidpublisher.googleapis.com/androidpublisher/v3";

export interface GooglePlayCredentialStatus {
  keyFilePath: string;
  keyFileExists: boolean;
  source: "environment" | "file" | "missing";
  serviceAccountEmail: string;
  serviceAccountProjectId: string;
  serviceAccountUniqueId: string;
}

export interface LivePlayRelease {
  track: string;
  versionCodes: number[];
  highestVersionCode: number;
}

function resolveGooglePlayConsoleConfig(): { packageName: string; keyFilePath: string } {
  return {
    packageName:
      process.env.ASOL_ANDROID_PACKAGE_NAME?.trim() ||
      process.env.GOOGLE_PLAY_PACKAGE_NAME?.trim() ||
      DEFAULT_PACKAGE_NAME,
    keyFilePath: path.resolve(
      process.cwd(),
      process.env.GOOGLE_PLAY_JSON_KEY_FILE?.trim() || DEFAULT_KEY_FILE,
    ),
  };
}

function resolveGooglePlayServiceAccountEnvironment() {
  return {
    jsonBase64: process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64?.trim() ?? "",
    type: process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_TYPE || "service_account",
    projectId: process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_PROJECT_ID,
    privateKeyId: process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_PRIVATE_KEY_ID,
    privateKeyBase64:
      process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_PRIVATE_KEY_BASE64?.trim() ?? "",
    clientEmail:
      process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_CLIENT_EMAIL?.trim() ||
      process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL?.trim() ||
      "",
    clientId:
      process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_CLIENT_ID ||
      process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_UNIQUE_ID,
    authUri:
      process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_AUTH_URI ||
      "https://accounts.google.com/o/oauth2/auth",
    tokenUri:
      process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_TOKEN_URI ||
      "https://oauth2.googleapis.com/token",
    authProviderX509CertUrl:
      process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_AUTH_PROVIDER_X509_CERT_URL ||
      "https://www.googleapis.com/oauth2/v1/certs",
    clientX509CertUrl:
      process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_CLIENT_X509_CERT_URL,
    universeDomain:
      process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_UNIVERSE_DOMAIN || "googleapis.com",
  };
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
    universeDomain: env.universeDomain,
  } as JWTInput;
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

export async function resolveGooglePlayCredentials() {
  const config = resolveGooglePlayConsoleConfig();
  const fromEnv = decodeServiceAccountFromEnvironment();
  if (fromEnv) {
    return {
      credentials: fromEnv,
      status: toStatus(config.keyFilePath, false, "environment", fromEnv),
    };
  }

  const keyFileExists = existsSync(config.keyFilePath);

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

export async function readLiveTrackVersionCodes(
  track: string,
): Promise<LivePlayRelease | null> {
  try {
    return await readLiveTrackVersionCodesStrict(track);
  } catch {
    return null;
  }
}

export async function readLiveTrackVersionCodesStrict(
  track: string,
): Promise<LivePlayRelease> {
  const credentialResolution = await resolveGooglePlayCredentials();
  if (!credentialResolution.credentials) {
    throw new Error(
      [
        "Google Play credentials are required to read live track versions.",
        "Configure GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64 or GOOGLE_PLAY_JSON_KEY_FILE.",
      ].join("\n"),
    );
  }

  const auth = new GoogleAuth({
    credentials: credentialResolution.credentials,
    scopes: [ANDROID_PUBLISHER_SCOPE],
  });
  const client = await auth.getClient();
  const config = resolveGooglePlayConsoleConfig();
  const packageName = encodeURIComponent(config.packageName);

  let editId: string | null = null;
  try {
    const edit = await client.request<{ id?: string }>({
      method: "POST",
      url: `${API_ROOT}/applications/${packageName}/edits`,
    });
    editId = edit.data.id ?? null;
    if (!editId) {
      throw new Error("Google Play edits API returned no edit id.");
    }

    const response = await client.request<{
      releases?: Array<{
        name?: string;
        versionCodes?: string[];
        status?: string;
      }>;
    }>({
      url: `${API_ROOT}/applications/${packageName}/edits/${encodeURIComponent(editId)}/tracks/${encodeURIComponent(track)}`,
    });

    const releases = response.data?.releases ?? [];
    const versionCodes: number[] = [];
    for (const release of releases) {
      if (Array.isArray(release.versionCodes)) {
        for (const code of release.versionCodes) {
          const num = Number(code);
          if (Number.isFinite(num)) versionCodes.push(num);
        }
      }
    }

    if (versionCodes.length === 0) {
      throw new Error(
        `Google Play track "${track}" returned no version codes for ${config.packageName}.`,
      );
    }
    versionCodes.sort((a, b) => a - b);
    const highestVersionCode = versionCodes[versionCodes.length - 1]!;
    return {
      track,
      versionCodes,
      highestVersionCode,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to read Google Play track "${track}" for ${config.packageName}: ${message}`,
    );
  } finally {
    if (editId) {
      try {
        await client.request({
          method: "DELETE",
          url: `${API_ROOT}/applications/${packageName}/edits/${encodeURIComponent(editId)}`,
        });
      } catch {
        // Edit cleanup is best-effort.
      }
    }
  }
}

/** Google Play Production is the single source of truth for published Android native versions. */
export async function requireGooglePlayProductionNativeVersion(): Promise<string> {
  const release = await readLiveTrackVersionCodesStrict("production");
  return androidVersionNameFromCode(release.highestVersionCode);
}

/**
 * Authenticated Android Publisher client for callers that must not import
 * `google-auth-library` themselves. Owns the vendor SDK behind `@asol/ota-core/publishing`.
 */
export async function createGooglePlayAuthClient(): Promise<{
  client: Awaited<ReturnType<GoogleAuth["getClient"]>>;
  packageName: string;
}> {
  const credentialResolution = await resolveGooglePlayCredentials();
  if (!credentialResolution.credentials) {
    throw new Error("googlePlayConsoleCredentialsMissing");
  }
  const auth = new GoogleAuth({
    credentials: credentialResolution.credentials,
    scopes: [ANDROID_PUBLISHER_SCOPE],
  });
  const client = await auth.getClient();
  const config = resolveGooglePlayConsoleConfig();
  return {
    client,
    packageName: encodeURIComponent(config.packageName),
  };
}
