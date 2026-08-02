/** Single responsibility: select and safely stream OTA bundle entries into staging. */
import { Unzip, UnzipInflate } from "fflate";
import { Sha256 } from "@aws-crypto/sha256-browser";

import type {
  OtaBundleEntry,
  OtaFileEntry,
  OtaManifest,
} from "../types/ota.types";

export interface SelectedOtaBundle {
  kind: "delta" | "full";
  entry: OtaBundleEntry;
}

export interface OtaBundleSink {
  begin(path: string): Promise<void>;
  append(path: string, bytes: Uint8Array): Promise<void>;
  verify(path: string, expected: OtaFileEntry): Promise<void>;
}

export function safeBundlePath(value: string): string {
  const normalized = value.replaceAll("\\", "/").replace(/^\/+/, "");
  if (
    !normalized ||
    normalized === ".." ||
    normalized.split("/").includes("..") ||
    normalized.includes("\0")
  ) {
    throw new Error(`Unsafe OTA bundle entry path: ${value}`);
  }
  return normalized;
}

export function selectOtaBundle(
  manifest: OtaManifest,
  localVersion: string,
): SelectedOtaBundle | null {
  const delta = manifest.bundles?.delta;
  if (delta?.fromVersion === localVersion) return { kind: "delta", entry: delta };
  const full = manifest.bundles?.full;
  return full ? { kind: "full", entry: full } : null;
}

export function bundleUrl(manifest: OtaManifest, entry: OtaBundleEntry): string {
  if (/^https:\/\//i.test(entry.path)) return entry.path;
  const releaseRoot = manifest.baseUrl.replace(/\/files\/?$/, "");
  return `${releaseRoot}/${safeBundlePath(entry.path)}`;
}

export async function verifyOtaBundleChunks(
  chunks: AsyncIterable<Uint8Array>,
  expectedHash: string,
  expectedSize: number,
): Promise<void> {
  const hash = new Sha256();
  let size = 0;
  for await (const chunk of chunks) {
    size += chunk.length;
    hash.update(chunk);
  }
  const digest = Array.from(await hash.digest(), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  if (size !== expectedSize || digest !== expectedHash) {
    throw new Error("OTA bundle checksum mismatch");
  }
}

export async function extractOtaBundle(
  chunks: AsyncIterable<Uint8Array>,
  expectedFiles: Readonly<Record<string, OtaFileEntry>>,
  sink: OtaBundleSink,
): Promise<string[]> {
  const extracted = new Set<string>();
  let writes = Promise.resolve();
  let failure: Error | null = null;
  const unzip = new Unzip((file) => {
    let path: string;
    try {
      path = safeBundlePath(file.name);
      if (!expectedFiles[path]) throw new Error(`Unexpected OTA bundle entry: ${path}`);
      if (extracted.has(path)) throw new Error(`Duplicate OTA bundle entry: ${path}`);
      extracted.add(path);
    } catch (error) {
      failure = error instanceof Error ? error : new Error(String(error));
      return;
    }
    writes = writes.then(() => sink.begin(path));
    file.ondata = (error, data) => {
      if (error) {
        failure = error;
        return;
      }
      if (data.length) writes = writes.then(() => sink.append(path, data));
    };
    file.start();
  });
  unzip.register(UnzipInflate);

  for await (const chunk of chunks) {
    unzip.push(chunk);
    await writes;
    if (failure) throw failure;
  }
  unzip.push(new Uint8Array(0), true);
  await writes;
  if (failure) throw failure;

  for (const path of extracted) await sink.verify(path, expectedFiles[path]!);
  const missing = Object.keys(expectedFiles).filter((path) => !extracted.has(path));
  if (missing.length) throw new Error(`OTA bundle is missing expected entry: ${missing[0]}`);
  return [...extracted].sort();
}
