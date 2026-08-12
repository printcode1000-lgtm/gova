import "server-only";

import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

import type { BundleAnalysis, BundleAnalysisComparison, BundleAnalysisDelta, BundleAnalysisNode, BundleCategory, BundleEntryDescriptor, R8RemovalSummary } from "../domain/bundle-analysis-types";

const EOCD_SIGNATURE = 0x06054b50;
const ZIP64_EOCD_SIGNATURE = 0x06064b50;
const ZIP64_LOCATOR_SIGNATURE = 0x07064b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const ANALYSIS_DIR = path.resolve(".backups", "build-jobs", "analysis");
const PATH_INDEX_DIR = path.join(ANALYSIS_DIR, "path-index");
const ABIS = ["arm64-v8a", "armeabi-v7a", "x86", "x86_64"];
const ARCHIVE_TOLERANCE_BYTES = 65_536;
const ARCHIVE_TOLERANCE_PER_ENTRY = 1_024;

export async function analyzeBundleArtifact(fullPath: string, expectedSha256?: string): Promise<BundleAnalysis> {
  const stat = await fs.stat(fullPath);
  const indexedSha = expectedSha256 ? null : await readIndexedSha(fullPath, stat.mtimeMs, stat.size);
  const sha256 = expectedSha256 ?? indexedSha ?? await streamSha256(fullPath);
  const cached = await readAnalysis(sha256);
  if (cached) {
    await writeIndexedSha(fullPath, stat.mtimeMs, stat.size, sha256);
    return cached;
  }
  const handle = await fs.open(fullPath, "r");
  try {
    const central = await locateCentralDirectory(handle, stat.size);
    const format = path.extname(fullPath).toLowerCase() === ".aab" ? "aab" : "apk";
    const entries = await readCentralEntries(handle, central.offset, central.size, central.count, format);
    const totalCompressedBytes = entries.reduce((sum, entry) => sum + entry.compressedBytes, 0);
    const totalUncompressedBytes = entries.reduce((sum, entry) => sum + entry.uncompressedBytes, 0);
    const categories = buildTree(entries, totalCompressedBytes);
    const localHeaderEstimate = entries.reduce(
      (sum, entry) => sum + 30 + Buffer.byteLength(entry.name) + entry.compressedBytes,
      0,
    );
    const archiveDifference = Math.abs(stat.size - localHeaderEstimate - central.size);
    const tolerance = ARCHIVE_TOLERANCE_BYTES + entries.length * ARCHIVE_TOLERANCE_PER_ENTRY;
    if (archiveDifference > tolerance) {
      throw new Error(`releaseBundleArchiveReconciliationFailed:${archiveDifference}:${tolerance}`);
    }
    const unclassifiedBytes = entries
      .filter((entry) => entry.category === "unclassified")
      .reduce((sum, entry) => sum + entry.compressedBytes, 0);
    if (unclassifiedBytes > 0) {
      const names = entries.filter((entry) => entry.category === "unclassified")
        .slice(0, 10).map((entry) => entry.name).join(",");
      throw new Error(`releaseBundleUnclassifiedEntries:${unclassifiedBytes}:${names}`);
    }
    const analysis: BundleAnalysis = {
      schemaVersion: 2, sha256, artifactName: path.basename(fullPath), format, analyzedAt: new Date().toISOString(), archiveBytes: stat.size,
      totalCompressedBytes, totalUncompressedBytes, entryCount: entries.length, categories, entries,
      largestWebEntries: entries.filter((entry) => entry.category === "webBundle").sort((a, b) => b.compressedBytes - a.compressedBytes).slice(0, 50),
      deliveryEstimates: format === "aab" ? deliveryEstimates(entries, totalCompressedBytes) : undefined,
      r8: await readR8Summary(fullPath, stat.mtimeMs),
    };
    await fs.mkdir(ANALYSIS_DIR, { recursive: true });
    await fs.writeFile(path.join(ANALYSIS_DIR, `${sha256}.json`), JSON.stringify(analysis), "utf8");
    await writeIndexedSha(fullPath, stat.mtimeMs, stat.size, sha256);
    return analysis;
  } finally { await handle.close(); }
}

export async function readAnalysis(sha256: string): Promise<BundleAnalysis | null> {
  if (!/^[a-f0-9]{64}$/.test(sha256)) throw new Error("releaseArtifactShaInvalid");
  try {
    const analysis = JSON.parse(await fs.readFile(path.join(ANALYSIS_DIR, `${sha256}.json`), "utf8")) as BundleAnalysis;
    return analysis.schemaVersion === 2 ? analysis : null;
  }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
}

export async function listCachedBundleAnalyses(): Promise<BundleAnalysis[]> {
  let files: string[];
  try { files = (await fs.readdir(ANALYSIS_DIR)).filter((file) => /^[a-f0-9]{64}\.json$/.test(file)); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  const analyses = (await Promise.all(files.map((file) => readAnalysis(file.replace(/\.json$/, "")))))
    .filter((analysis): analysis is BundleAnalysis => analysis !== null);
  return analyses.sort((left, right) => right.analyzedAt.localeCompare(left.analyzedAt));
}

export async function compareCachedBundleAnalyses(leftSha: string, rightSha: string): Promise<BundleAnalysisComparison> {
  const [left, right] = await Promise.all([readAnalysis(leftSha), readAnalysis(rightSha)]);
  if (!left || !right) throw new Error("releaseBundleAnalysisNotFound");
  return compareBundleAnalyses(left, right);
}

export function compareBundleAnalyses(left: BundleAnalysis, right: BundleAnalysis): BundleAnalysisComparison {
  const categories = deltaMaps(new Map(left.categories.map((node) => [node.id, node])), new Map(right.categories.map((node) => [node.id, node])));
  const files = deltaMaps(new Map(left.entries.map((entry) => [entry.name, entry])), new Map(right.entries.map((entry) => [entry.name, entry])));
  return {
    leftSha256: left.sha256, rightSha256: right.sha256,
    total: makeDelta("total", left.totalCompressedBytes, right.totalCompressedBytes, left.totalUncompressedBytes, right.totalUncompressedBytes),
    categories, files,
  };
}

async function locateCentralDirectory(
  handle: fs.FileHandle,
  archiveSize: number,
): Promise<{ offset: number; size: number; count: number }> {
  const tailSize = Math.min(archiveSize, 65_557);
  const tail = Buffer.alloc(tailSize);
  await handle.read(tail, 0, tailSize, archiveSize - tailSize);
  let eocd = -1;
  for (let index = tail.length - 22; index >= 0; index -= 1) if (tail.readUInt32LE(index) === EOCD_SIGNATURE) { eocd = index; break; }
  if (eocd < 0 || eocd + 22 > tail.length) throw new Error("releaseBundleZipEocdMissing");
  let count = tail.readUInt16LE(eocd + 10);
  let size = tail.readUInt32LE(eocd + 12);
  let offset = tail.readUInt32LE(eocd + 16);
  if (count !== 0xffff && size !== 0xffffffff && offset !== 0xffffffff) return { count, size, offset };
  const absoluteEocd = archiveSize - tailSize + eocd;
  if (absoluteEocd < 20) throw new Error("releaseBundleZip64LocatorMissing");
  const locator = Buffer.alloc(20);
  await handle.read(locator, 0, 20, absoluteEocd - 20);
  if (locator.readUInt32LE(0) !== ZIP64_LOCATOR_SIGNATURE) throw new Error("releaseBundleZip64LocatorMissing");
  const zip64Offset = toSafeNumber(locator.readBigUInt64LE(8));
  const header = Buffer.alloc(56);
  await handle.read(header, 0, 56, zip64Offset);
  if (header.readUInt32LE(0) !== ZIP64_EOCD_SIGNATURE) throw new Error("releaseBundleZip64EocdMissing");
  count = toSafeNumber(header.readBigUInt64LE(32));
  size = toSafeNumber(header.readBigUInt64LE(40));
  offset = toSafeNumber(header.readBigUInt64LE(48));
  return { count, size, offset };
}

async function readCentralEntries(
  handle: fs.FileHandle,
  startOffset: number,
  centralSize: number,
  count: number,
  format: "apk" | "aab",
): Promise<BundleEntryDescriptor[]> {
  const entries: BundleEntryDescriptor[] = [];
  const central = Buffer.alloc(centralSize);
  const result = await handle.read(central, 0, central.length, startOffset);
  if (result.bytesRead !== central.length) throw new Error("releaseBundleCentralDirectoryTruncated");
  let offset = 0;
  for (let index = 0; index < count; index += 1) {
    const fixed = central.subarray(offset, offset + 46);
    if (fixed.length !== 46 || fixed.readUInt32LE(0) !== CENTRAL_SIGNATURE) {
      throw new Error(`releaseBundleCentralDirectoryInvalid:${index}`);
    }
    const nameLength = fixed.readUInt16LE(28);
    const extraLength = fixed.readUInt16LE(30);
    const commentLength = fixed.readUInt16LE(32);
    const variable = central.subarray(offset + 46, offset + 46 + nameLength + extraLength);
    const name = variable.subarray(0, nameLength).toString("utf8").replace(/\\/g, "/");
    const extra = variable.subarray(nameLength);
    let compressed = fixed.readUInt32LE(20);
    let uncompressed = fixed.readUInt32LE(24);
    if (compressed === 0xffffffff || uncompressed === 0xffffffff) {
      const zip64 = findExtra(extra, 0x0001);
      if (!zip64) throw new Error("releaseBundleZip64ExtraMissing");
      let cursor = 0;
      if (uncompressed === 0xffffffff) { uncompressed = toSafeNumber(zip64.readBigUInt64LE(cursor)); cursor += 8; }
      if (compressed === 0xffffffff) compressed = toSafeNumber(zip64.readBigUInt64LE(cursor));
    }
    const classified = classifyEntry(name, format);
    entries.push({ name, ...classified, compressionMethod: fixed.readUInt16LE(10), compressedBytes: compressed, uncompressedBytes: uncompressed, crc32: fixed.readUInt32LE(16) });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function findExtra(extra: Buffer, id: number): Buffer | null {
  let offset = 0;
  while (offset + 4 <= extra.length) {
    const fieldId = extra.readUInt16LE(offset);
    const length = extra.readUInt16LE(offset + 2);
    if (offset + 4 + length > extra.length) return null;
    if (fieldId === id) return extra.subarray(offset + 4, offset + 4 + length);
    offset += 4 + length;
  }
  return null;
}

export function classifyEntry(
  name: string,
  format: "apk" | "aab" = "apk",
): { category: BundleCategory; categoryPath: string[] } {
  const normalized = name.replace(/^base\//, "");
  const native = /^(?:base\/)?lib\/([^/]+)\/([^/]+\.so)$/i.exec(name);
  if (native) return { category: "nativeLibraries", categoryPath: ["nativeLibraries", native[1]!, native[2]!] };
  if (/^(?:base\/dex\/|)classes\d*\.dex$/i.test(name) || /^base\/dex\/[^/]+\.dex$/i.test(name)) return { category: "compiledCode", categoryPath: ["compiledCode", path.posix.basename(name)] };
  const web = /^(?:base\/)?assets\/public\/(.+)$/i.exec(name);
  if (web) return { category: "webBundle", categoryPath: ["webBundle", webKind(web[1]!), web[1]!] };
  const resource = /^(?:base\/)?res\/([^/]+)\//i.exec(name);
  if (resource || /^(?:base\/)?resources\.arsc$/i.test(name)) {
    const folder = resource?.[1] ?? "table";
    const [kind = "other", ...qualifiers] = folder.split("-");
    const density = qualifiers.find((value) => /^(?:ldpi|mdpi|tvdpi|hdpi|xhdpi|xxhdpi|xxxhdpi|nodpi|anydpi)$/.test(value)) ?? "default";
    return { category: "androidResources", categoryPath: ["androidResources", kind, density, normalized] };
  }
  if (/^(?:base\/)?assets\//i.test(name)) return { category: "otherAssets", categoryPath: ["otherAssets", normalized] };
  if (
    /^(?:base\/root\/)?(?:kotlin|okhttp3|okio|google|com|org|junit)\//i.test(name) ||
    /^(?:LICENSE|NOTICE)(?:[-_.]|$)/i.test(normalized) ||
    /\.(?:proto|bin|properties|version)$/i.test(name)
  ) {
    return { category: "packagedJavaResources", categoryPath: ["packagedJavaResources", normalized] };
  }
  if (/^(?:AndroidManifest\.xml|base\/manifest\/|base\/root\/|META-INF\/|BUNDLE-METADATA\/|stamp-cert-sha256)/i.test(name)) return { category: "manifestMetadataSigning", categoryPath: ["manifestMetadataSigning", normalized] };
  const moduleName = /^([^/]+)\//.exec(name)?.[1];
  if (format === "aab" && moduleName && moduleName !== "base" && /\/(?:manifest|dex|res|assets|lib|root)\//.test(`/${name}`)) {
    return { category: "featureModules", categoryPath: ["featureModules", moduleName, name] };
  }
  return { category: "unclassified", categoryPath: ["unclassified", name] };
}

function webKind(name: string): string {
  const extension = path.posix.extname(name).toLowerCase();
  if ([".js", ".mjs", ".cjs"].includes(extension)) return "javascript";
  if (extension === ".css") return "css";
  if ([".html", ".htm"].includes(extension)) return "html";
  if (extension === ".txt") return "rsc";
  if (extension === ".json") return "json";
  if ([".png", ".jpg", ".jpeg", ".webp", ".svg", ".ico"].includes(extension)) return `images:${extension === ".jpeg" ? "jpg" : extension.slice(1)}`;
  if ([".woff", ".woff2", ".ttf", ".otf"].includes(extension)) return "fonts";
  if (extension === ".wasm") return "wasm";
  return "other";
}

function buildTree(entries: BundleEntryDescriptor[], totalCompressed: number): BundleAnalysisNode[] {
  type Mutable = BundleAnalysisNode & { childMap: Map<string, Mutable> };
  const roots = new Map<string, Mutable>();
  for (const entry of entries) {
    let siblings = roots;
    let parentId = "";
    for (const segment of entry.categoryPath) {
      parentId = parentId ? `${parentId}/${segment}` : segment;
      let node = siblings.get(segment);
      if (!node) { node = { id: parentId, label: segment, compressedBytes: 0, uncompressedBytes: 0, entryCount: 0, percentage: 0, children: [], childMap: new Map() }; siblings.set(segment, node); }
      node.compressedBytes += entry.compressedBytes; node.uncompressedBytes += entry.uncompressedBytes; node.entryCount += 1;
      siblings = node.childMap;
    }
  }
  const finalize = (node: Mutable): BundleAnalysisNode => ({ id: node.id, label: node.label, compressedBytes: node.compressedBytes, uncompressedBytes: node.uncompressedBytes, entryCount: node.entryCount, percentage: totalCompressed ? node.compressedBytes / totalCompressed * 100 : 0, children: [...node.childMap.values()].map(finalize).sort((a, b) => b.compressedBytes - a.compressedBytes) });
  return [...roots.values()].map(finalize).sort((a, b) => b.compressedBytes - a.compressedBytes);
}

function deliveryEstimates(entries: BundleEntryDescriptor[], total: number) {
  const nativeByAbi = new Map<string, number>();
  for (const entry of entries.filter((item) => item.category === "nativeLibraries")) nativeByAbi.set(entry.categoryPath[1]!, (nativeByAbi.get(entry.categoryPath[1]!) ?? 0) + entry.compressedBytes);
  const allNative = [...nativeByAbi.values()].reduce((sum, value) => sum + value, 0);
  const densityGroups = splitResourceVariants(entries, /(?:^|-)\b(ldpi|mdpi|tvdpi|hdpi|xhdpi|xxhdpi|xxxhdpi)\b/i);
  const languageGroups = splitResourceVariants(entries, /(?:^|\/)values-([a-z]{2,3}(?:-r[A-Z]{2})?)(?:-|\/)/);
  const density = densityGroups.has("xhdpi") ? "xhdpi" : densityGroups.keys().next().value;
  const language = languageGroups.has("en") ? "en" : languageGroups.keys().next().value;
  const densityReduction = excludedVariantBytes(densityGroups, density);
  const languageReduction = excludedVariantBytes(languageGroups, language);
  return ABIS.filter((abi) => nativeByAbi.has(abi)).map((abi) => ({
    abi,
    density,
    language,
    compressedBytes: Math.max(0, total - allNative + (nativeByAbi.get(abi) ?? 0) - densityReduction - languageReduction),
    noteKey: "releaseConsole.analysis.deliveryEstimateNote",
  }));
}

function splitResourceVariants(entries: BundleEntryDescriptor[], pattern: RegExp): Map<string, number> {
  const groups = new Map<string, number>();
  for (const entry of entries.filter((item) => item.category === "androidResources")) {
    const match = pattern.exec(entry.name);
    if (match?.[1]) groups.set(match[1], (groups.get(match[1]) ?? 0) + entry.compressedBytes);
  }
  return groups;
}

function excludedVariantBytes(groups: Map<string, number>, selected?: string): number {
  return [...groups].reduce((sum, [key, bytes]) => sum + (key === selected ? 0 : bytes), 0);
}

async function readR8Summary(fullPath: string, artifactMtimeMs: number): Promise<R8RemovalSummary | undefined> {
  if (/debug|releaseNoR8/i.test(fullPath) || !/release/i.test(fullPath)) return undefined;
  const directory = path.resolve("android", "app", "build", "outputs", "mapping", "release");
  const [usage, resources, mapping] = await Promise.all([readOptional(path.join(directory, "usage.txt")), readOptional(path.join(directory, "resources.txt")), readOptional(path.join(directory, "mapping.txt"))]);
  if (!usage && !resources && !mapping) return undefined;
  const reportMtimes = (await Promise.all([
    optionalMtime(path.join(directory, "usage.txt")),
    optionalMtime(path.join(directory, "resources.txt")),
    optionalMtime(path.join(directory, "mapping.txt")),
  ])).filter((mtime): mtime is number => mtime !== null);
  const sameBuildWindow = reportMtimes.some((mtime) => Math.abs(mtime - artifactMtimeMs) <= 15 * 60_000);
  if (!sameBuildWindow) return undefined;
  return {
    removedCodeEntries: usage?.text.split(/\r?\n/).filter((line) => line.trim() && !/^\s/.test(line)).length,
    removedResourceEntries: resources?.text.split(/\r?\n/).filter((line) => line.trim()).length,
    usageReportBytes: usage?.size, resourcesReportBytes: resources?.size, mappingBytes: mapping?.size,
  };
}

async function optionalMtime(filePath: string): Promise<number | null> {
  try { return (await fs.stat(filePath)).mtimeMs; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
}

async function readOptional(filePath: string): Promise<{ text: string; size: number } | null> {
  try { const [text, stat] = await Promise.all([fs.readFile(filePath, "utf8"), fs.stat(filePath)]); return { text, size: stat.size }; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
}

function deltaMaps(left: Map<string, { compressedBytes: number; uncompressedBytes: number }>, right: Map<string, { compressedBytes: number; uncompressedBytes: number }>): BundleAnalysisDelta[] {
  return [...new Set([...left.keys(), ...right.keys()])].map((id) => makeDelta(id, left.get(id)?.compressedBytes ?? 0, right.get(id)?.compressedBytes ?? 0, left.get(id)?.uncompressedBytes ?? 0, right.get(id)?.uncompressedBytes ?? 0)).sort((a, b) => Math.abs(b.compressedDeltaBytes) - Math.abs(a.compressedDeltaBytes));
}
function makeDelta(id: string, leftCompressedBytes: number, rightCompressedBytes: number, leftUncompressedBytes: number, rightUncompressedBytes: number): BundleAnalysisDelta {
  const delta = rightCompressedBytes - leftCompressedBytes;
  const state = leftCompressedBytes === 0 && rightCompressedBytes > 0 ? "new" : rightCompressedBytes === 0 && leftCompressedBytes > 0 ? "removed" : delta > 0 ? "grown" : delta < 0 ? "shrunk" : "unchanged";
  return { id, state, leftCompressedBytes, rightCompressedBytes, compressedDeltaBytes: delta, compressedDeltaPercent: leftCompressedBytes ? delta / leftCompressedBytes * 100 : null, leftUncompressedBytes, rightUncompressedBytes };
}
function toSafeNumber(value: bigint): number { const number = Number(value); if (!Number.isSafeInteger(number)) throw new Error("releaseBundleZip64TooLarge"); return number; }
async function streamSha256(fullPath: string): Promise<string> { return new Promise((resolve, reject) => { const hash = createHash("sha256"); const stream = createReadStream(fullPath); stream.on("error", reject); hash.on("error", reject); hash.on("finish", () => resolve(hash.digest("hex"))); stream.pipe(hash); }); }

async function readIndexedSha(fullPath: string, mtimeMs: number, size: number): Promise<string | null> {
  try {
    const value = JSON.parse(await fs.readFile(pathIndexPath(fullPath), "utf8")) as {
      fullPath: string;
      mtimeMs: number;
      size: number;
      sha256: string;
    };
    return value.fullPath === path.resolve(fullPath) && value.mtimeMs === mtimeMs && value.size === size
      ? value.sha256
      : null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function writeIndexedSha(fullPath: string, mtimeMs: number, size: number, sha256: string): Promise<void> {
  await fs.mkdir(PATH_INDEX_DIR, { recursive: true });
  await fs.writeFile(
    pathIndexPath(fullPath),
    JSON.stringify({ fullPath: path.resolve(fullPath), mtimeMs, size, sha256 }),
    "utf8",
  );
}

function pathIndexPath(fullPath: string): string {
  const key = createHash("sha256").update(path.resolve(fullPath).toLowerCase()).digest("hex");
  return path.join(PATH_INDEX_DIR, `${key}.json`);
}
