import { createPublicKey } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  assertR2StorageTarget,
  assertR2StorageTargetFields,
} from "../r2-storage-topology";

import { readOptionalEnv, R2CloudflareCredentials } from "./server-env.values.turso-env";

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

export function requireEnv(key: string): string {
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

export function getOtaR2CloudflareCredentials(): R2CloudflareCredentials {
  const credentials = {
    accountId: requireEnv("ASOL_OTA_R2_ACCOUNT_ID"),
    apiToken: requireEnv("ASOL_OTA_R2_API_TOKEN"),
  };
  assertR2StorageTargetFields("ota", {
    accountId: credentials.accountId,
  });
  return credentials;
}

export function getOtaR2S3Credentials(): R2S3Credentials {
  const jurisdiction = (readOptionalEnv("ASOL_OTA_R2_JURISDICTION") ??
    "default") as R2S3Credentials["jurisdiction"];
  const credentials = {
    accessKeyId: requireEnv("ASOL_OTA_R2_ACCESS_KEY_ID"),
    secretAccessKey: requireEnv("ASOL_OTA_R2_SECRET_ACCESS_KEY"),
    endpoint: requireEnv("ASOL_OTA_R2_ENDPOINT"),
    bucketName: requireEnv("ASOL_OTA_R2_BUCKET_NAME"),
    location: readOptionalEnv("ASOL_OTA_R2_LOCATION") ?? "WEUR",
    jurisdiction,
  };
  assertR2StorageTargetFields("ota", credentials);
  return credentials;
}

export function getOtaR2PublicUrl(): string {
  return requireEnv("ASOL_OTA_R2_PUBLIC_URL");
}

export function getOtaR2Config(): R2Config {
  const cloudflare = getOtaR2CloudflareCredentials();
  const s3 = getOtaR2S3Credentials();
  const config = {
    cloudflare,
    s3,
    publicUrl: requireEnv("ASOL_OTA_R2_PUBLIC_URL"),
    catalogUri: readOptionalEnv("ASOL_OTA_R2_CATALOG_URI") ?? "",
    warehouseName: readOptionalEnv("ASOL_OTA_R2_WAREHOUSE_NAME") ?? "",
  };
  assertR2StorageTarget("ota", {
    accountId: cloudflare.accountId,
    endpoint: s3.endpoint,
    bucketName: s3.bucketName,
    publicUrl: config.publicUrl,
    location: s3.location,
    jurisdiction: s3.jurisdiction,
  });
  return config;
}
