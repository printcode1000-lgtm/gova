import "server-only";
import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  appendFile,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { catalogStudioChildProcessEnv } from "@/core/config/catalog-studio.server";
import type {
  CatalogStudioAuditEntry,
  CatalogStudioDraftFile,
  CatalogStudioFile,
  CatalogStudioGroup,
  CatalogStudioImage,
  CatalogStudioImageRoot,
  CatalogStudioRelation,
  CatalogStudioSaveResult,
  CatalogStudioSnapshot,
  CatalogStudioValidationResult,
} from "../../../domain/catalog-studio.types";

import { publicRoot, catalogRoot, stateRoot, auditPath, journalPath, transactionRoot, TransactionJournal, sha256, normalizeRelative, resolveInside, formattedJson, loadCatalogFiles, fileMap, manifestImageRoots } from "./catalog-studio.service.server.catalog-files";

export async function readAudit(): Promise<CatalogStudioAuditEntry[]> {
  try {
    const content = await readFile(auditPath, "utf8");
    return content
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line) as CatalogStudioAuditEntry)
      .slice(-100)
      .reverse();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

export async function appendAudit(entry: CatalogStudioAuditEntry): Promise<void> {
  await mkdir(stateRoot, { recursive: true });
  await appendFile(auditPath, `${JSON.stringify(entry)}\n`, "utf8");
}

export async function writeJsonAtomic(targetPath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(targetPath), { recursive: true });
  const temporaryPath = `${targetPath}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporaryPath, targetPath);
}

export async function restoreJournal(journal: TransactionJournal): Promise<void> {
  for (const relativePath of journal.files) {
    const backup = resolveInside(journal.backupRoot, relativePath);
    const target = resolveInside(catalogRoot, relativePath);
    const temporary = `${target}.${randomUUID()}.rollback.tmp`;
    await cp(backup, temporary);
    await rename(temporary, target);
  }
  await rm(path.join(transactionRoot, journal.id), { recursive: true, force: true });
  await rm(journalPath, { force: true });
}

export async function recoverInterruptedTransaction(): Promise<void> {
  try {
    const journal = JSON.parse(await readFile(journalPath, "utf8")) as TransactionJournal;
    await restoreJournal(journal);
    await appendAudit({
      at: new Date().toISOString(),
      action: "rollback-recovery",
      files: journal.files,
      details: "Recovered an interrupted Catalog transaction from its complete backup.",
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
}

export function snapshotRevision(files: readonly CatalogStudioFile[]): string {
  return sha256(
    files
      .map((file) => `${file.path}:${file.hash}`)
      .sort()
      .join("\n"),
  );
}

export async function stageDrafts(drafts: readonly CatalogStudioDraftFile[]) {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "asol-catalog-studio-"));
  const stagedCatalogRoot = path.join(temporaryRoot, "catagory");
  await cp(catalogRoot, stagedCatalogRoot, { recursive: true });
  for (const draft of drafts) {
    await writeFile(
      resolveInside(stagedCatalogRoot, draft.path),
      formattedJson(draft.content, draft.path),
      "utf8",
    );
  }
  return { temporaryRoot, stagedCatalogRoot };
}

export async function normalizeDrafts(
  drafts: readonly CatalogStudioDraftFile[],
): Promise<CatalogStudioDraftFile[]> {
  if (drafts.length === 0) throw new Error("catalogStudioNoChanges");
  const available = fileMap(await loadCatalogFiles());
  const seen = new Set<string>();
  return drafts.map((draft) => {
    const relativePath = normalizeRelative(draft.path);
    const current = available.get(relativePath);
    if (!current || current.readOnly || !relativePath.endsWith(".json")) {
      throw new Error(`catalogStudioFileNotEditable:${relativePath}`);
    }
    if (seen.has(relativePath)) throw new Error(`catalogStudioDuplicateDraft:${relativePath}`);
    seen.add(relativePath);
    return {
      path: relativePath,
      baseHash: draft.baseHash,
      content: formattedJson(draft.content, relativePath),
    };
  });
}

export async function currentImageRoots(): Promise<Record<CatalogStudioImageRoot, string>> {
  const files = fileMap(await loadCatalogFiles());
  const roots = manifestImageRoots(files);
  return {
    mainCategories: resolveInside(publicRoot, roots.mainCategories),
    subcategories: resolveInside(publicRoot, roots.subcategories),
    pharmacy: resolveInside(publicRoot, roots.pharmacy),
    vehicles: resolveInside(publicRoot, roots.vehicles),
  };
}

export function assertImageBytes(buffer: Uint8Array, extension: string): void {
  const bytes = Buffer.from(buffer);
  const png = bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"));
  const jpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const webp =
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP";
  if (
    (extension === ".png" && !png) ||
    ((extension === ".jpg" || extension === ".jpeg") && !jpeg) ||
    (extension === ".webp" && !webp)
  ) {
    throw new Error("catalogStudioImageSignatureInvalid");
  }
}
