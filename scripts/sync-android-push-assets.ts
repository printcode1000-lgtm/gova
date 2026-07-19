import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: [".env.local", ".env"], quiet: true });

const EXPECTED = {
  projectName: "asole",
  projectId: "asole-73f1f",
  projectNumber: "543298343631",
  appId: "1:543298343631:android:01192cf95a765130609dba",
  packageName: "hgh.asol.app",
  storageBucket: "asole-73f1f.firebasestorage.app",
  apiKey: "AIzaSyDyr_MrGZIJEW_eW7VSl8LzwmlVg8MjquI",
  configurationVersion: "1",
} as const;

const targetConfig = path.resolve("android", "app", "google-services.json");
const sourceSound = path.resolve(
  "assets",
  "google-play",
  "custom_notification.mp3",
);
const targetSound = path.resolve(
  "android",
  "app",
  "src",
  "main",
  "res",
  "raw",
  "custom_notification.mp3",
);

interface GoogleServicesConfig {
  project_info?: {
    project_number?: string;
    project_id?: string;
    storage_bucket?: string;
  };
  client?: Array<{
    client_info?: {
      mobilesdk_app_id?: string;
      android_client_info?: { package_name?: string };
    };
    api_key?: Array<{ current_key?: string }>;
    oauth_client?: Array<{ client_id?: string }>;
  }>;
  configuration_version?: string;
}

function validateIdentityEnvironment(): void {
  const required: Record<string, string> = {
    FIREBASE_PROJECT_NAME: EXPECTED.projectName,
    FIREBASE_PROJECT_ID: EXPECTED.projectId,
    FIREBASE_PROJECT_NUMBER: EXPECTED.projectNumber,
    FIREBASE_FCM_SENDER_ID: EXPECTED.projectNumber,
    FIREBASE_ANDROID_APP_ID: EXPECTED.appId,
    FIREBASE_ANDROID_APP_NICKNAME: "ASOL Android",
    FIREBASE_ANDROID_PACKAGE_NAME: EXPECTED.packageName,
    FIREBASE_STORAGE_BUCKET: EXPECTED.storageBucket,
    FIREBASE_ANDROID_API_KEY: EXPECTED.apiKey,
    FIREBASE_ANDROID_CONFIGURATION_VERSION: EXPECTED.configurationVersion,
    FIREBASE_ANDROID_OAUTH_CLIENT_IDS: "[]",
    FIREBASE_ANDROID_SHA1:
      "fe:85:eb:f4:8c:51:a3:50:23:49:c2:b1:f5:56:ff:e6:30:4d:c0:88",
    FIREBASE_ANDROID_SHA256:
      "63:66:4d:27:20:33:d0:04:d1:cb:11:63:23:ef:af:96:56:ff:9e:6d:c6:6d:62:40:28:0d:67:4b:1e:a0:41:30",
  };
  const failures = Object.entries(required)
    .filter(([key, expected]) => process.env[key]?.trim() !== expected)
    .map(([key]) => key);
  if (failures.length > 0) {
    throw new Error(`Android Firebase environment mismatch: ${failures.join(", ")}`);
  }
}

function requireFile(filePath: string): void {
  if (!existsSync(filePath)) {
    throw new Error(`Required Android push asset is missing: ${filePath}`);
  }
}

function readGoogleServices(): { raw: string; config: GoogleServicesConfig } {
  const encoded = process.env.FIREBASE_ANDROID_GOOGLE_SERVICES_BASE64?.trim();
  if (!encoded) {
    throw new Error(
      "FIREBASE_ANDROID_GOOGLE_SERVICES_BASE64 is required for Android builds.",
    );
  }
  let raw = "";
  let config: GoogleServicesConfig;
  try {
    raw = Buffer.from(encoded, "base64").toString("utf8");
    config = JSON.parse(raw) as GoogleServicesConfig;
  } catch {
    throw new Error("FIREBASE_ANDROID_GOOGLE_SERVICES_BASE64 is invalid.");
  }
  const client = config.client?.find(
    (entry) =>
      entry.client_info?.android_client_info?.package_name ===
      EXPECTED.packageName,
  );
  const failures = [
    config.project_info?.project_id === EXPECTED.projectId || "project_id",
    config.project_info?.project_number === EXPECTED.projectNumber ||
      "project_number",
    client?.client_info?.mobilesdk_app_id === EXPECTED.appId ||
      "mobilesdk_app_id",
    client?.client_info?.android_client_info?.package_name ===
      EXPECTED.packageName || "package_name",
    config.project_info?.storage_bucket === EXPECTED.storageBucket ||
      "storage_bucket",
    client?.api_key?.[0]?.current_key === EXPECTED.apiKey || "api_key",
    config.configuration_version === EXPECTED.configurationVersion ||
      "configuration_version",
  ].filter((value): value is string => typeof value === "string");

  if (failures.length > 0) {
    throw new Error(
      `google-services.json does not match ASOL Android: ${failures.join(", ")}`,
    );
  }
  return { raw, config };
}

function main(): void {
  requireFile(sourceSound);
  validateIdentityEnvironment();
  const { raw } = readGoogleServices();
  mkdirSync(path.dirname(targetConfig), { recursive: true });
  mkdirSync(path.dirname(targetSound), { recursive: true });
  writeFileSync(targetConfig, raw.endsWith("\n") ? raw : `${raw}\n`, "utf8");
  copyFileSync(sourceSound, targetSound);
  console.log("Android push assets validated and synchronized.");
}

main();
