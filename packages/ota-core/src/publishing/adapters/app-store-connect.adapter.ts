import { createSign } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { compareOtaVersions } from "../../domain/versioning/version-ordering";
import { assertNativeVersion } from "../../domain/versioning/content-version";

const APP_STORE_CONNECT_API = "https://api.appstoreconnect.apple.com/v1";

export function appStoreConnectCredentialsAreReady(
  env: NodeJS.ProcessEnv = process.env,
  cwd = process.cwd(),
): boolean {
  const keyId = env.APP_STORE_CONNECT_API_KEY_KEY_ID?.trim() ?? "";
  const issuerId = env.APP_STORE_CONNECT_API_KEY_ISSUER_ID?.trim() ?? "";
  const keyPath = env.APP_STORE_CONNECT_API_KEY_KEY_FILEPATH?.trim() ?? "";
  if (!keyId || !issuerId || !keyPath) return false;
  const resolved = path.isAbsolute(keyPath) ? keyPath : path.resolve(cwd, keyPath);
  return existsSync(resolved);
}

export const APP_STORE_LIVE_VERSION_STATES = ["READY_FOR_DISTRIBUTION"] as const;

function resolveAppStoreConnectConfig(): {
  keyId: string;
  issuerId: string;
  keyPath: string;
  bundleId: string;
} {
  const keyId = process.env.APP_STORE_CONNECT_API_KEY_KEY_ID?.trim() ?? "";
  const issuerId = process.env.APP_STORE_CONNECT_API_KEY_ISSUER_ID?.trim() ?? "";
  const keyPath = process.env.APP_STORE_CONNECT_API_KEY_KEY_FILEPATH?.trim() ?? "";
  const bundleId = process.env.ASOL_IOS_BUNDLE_ID?.trim() || "hgh.asol.app";
  if (!keyId || !issuerId || !keyPath) {
    throw new Error(
      [
        "App Store Connect credentials are required to read the published iOS version.",
        "Configure APP_STORE_CONNECT_API_KEY_KEY_ID, APP_STORE_CONNECT_API_KEY_ISSUER_ID,",
        "and APP_STORE_CONNECT_API_KEY_KEY_FILEPATH.",
      ].join("\n"),
    );
  }
  const resolved = path.isAbsolute(keyPath) ? keyPath : path.resolve(process.cwd(), keyPath);
  if (!existsSync(resolved)) {
    throw new Error(`App Store Connect API key file was not found: ${resolved}`);
  }
  return { keyId, issuerId, keyPath: resolved, bundleId };
}

function createAppStoreConnectToken(config: ReturnType<typeof resolveAppStoreConnectConfig>): string {
  const privateKey = readFileSync(config.keyPath, "utf8");
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(
    JSON.stringify({ alg: "ES256", kid: config.keyId, typ: "JWT" }),
  ).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      iss: config.issuerId,
      iat: now,
      exp: now + 1200,
      aud: "appstoreconnect-v1",
    }),
  ).toString("base64url");
  const signingInput = `${header}.${payload}`;
  const sign = createSign("SHA256");
  sign.update(signingInput);
  sign.end();
  const signature = sign
    .sign({ key: privateKey, dsaEncoding: "ieee-p1363" })
    .toString("base64url");
  return `${signingInput}.${signature}`;
}

async function appStoreConnectGet<T>(url: string, token: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`App Store Connect API ${response.status}: ${body.slice(0, 500)}`);
  }
  return (await response.json()) as T;
}

/** Published App Store versions are the single source of truth for iOS native versions. */
export async function requireIosProductionNativeVersion(): Promise<string> {
  const config = resolveAppStoreConnectConfig();
  const token = createAppStoreConnectToken(config);

  const apps = await appStoreConnectGet<{
    data?: Array<{ id?: string }>;
  }>(
    `${APP_STORE_CONNECT_API}/apps?filter[bundleId]=${encodeURIComponent(config.bundleId)}&limit=1`,
    token,
  );
  const appId = apps.data?.[0]?.id;
  if (!appId) {
    throw new Error(
      `No App Store Connect app found for bundle id ${config.bundleId}.`,
    );
  }

  const versions = await appStoreConnectGet<{
    data?: Array<{ attributes?: { versionString?: string; appVersionState?: string } }>;
  }>(
    `${APP_STORE_CONNECT_API}/apps/${encodeURIComponent(appId)}/appStoreVersions?filter[appVersionState]=${APP_STORE_LIVE_VERSION_STATES.join(",")}&limit=50`,
    token,
  );

  const candidates = (versions.data ?? [])
    .map((entry) => entry.attributes?.versionString?.trim() ?? "")
    .filter((value) => /^\d+\.\d+\.\d+$/.test(value));

  if (candidates.length === 0) {
    throw new Error(
      `No READY_FOR_DISTRIBUTION iOS version found for bundle id ${config.bundleId}.`,
    );
  }

  const highest = candidates.reduce((best, current) =>
    compareOtaVersions(current, best) > 0 ? current : best,
  );
  assertNativeVersion(highest);
  return highest;
}
