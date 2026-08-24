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
} from "../../domain/catalog-studio.types";

import { workspaceRoot, publicRoot, catalogRoot, stateRoot, journalPath, transactionRoot, MAX_IMAGE_BYTES, IMAGE_EXTENSIONS, JsonRecord, TransactionJournal, normalizeRelative, resolveInside, parseJson, itemArray, loadCatalogFiles, fileMap, parsedFile, parsedItems, buildRelations, buildImages, runValidator } from "./catalog-studio-service/catalog-studio.service.server.catalog-files";
import { readAudit, appendAudit, writeJsonAtomic, restoreJournal, recoverInterruptedTransaction, snapshotRevision, stageDrafts, normalizeDrafts, currentImageRoots, assertImageBytes } from "./catalog-studio-service/catalog-studio.service.server.catalog-relations";

let saveBusy = false;

export class CatalogStudioService {
  async snapshot(): Promise<CatalogStudioSnapshot> {
    await recoverInterruptedTransaction();
    const files = await loadCatalogFiles();
    const filesByPath = fileMap(files);
    const [images, validation, audit] = await Promise.all([
      buildImages(filesByPath),
      runValidator(catalogRoot),
      readAudit(),
    ]);
    const manifest = parsedFile(filesByPath, "manifest.json");
    const allItems = files.flatMap((file) => itemArray(parseJson(file.content, file.path)).items);
    const specialtyMappings = parsedItems(filesByPath, "core/specialty-columns.json");
    return {
      revision: snapshotRevision(files),
      files,
      images,
      relations: buildRelations(filesByPath),
      audit,
      stats: {
        schemaVersion: Number(manifest.schemaVersion),
        catalogVersion: String(manifest.catalogVersion),
        dataFiles: files.filter((file) => !file.readOnly).length,
        schemaFiles: files.filter((file) => file.readOnly).length,
        items: allItems.length,
        hiddenItems: allItems.filter((item) => {
          const display = item.display as JsonRecord | undefined;
          return display?.hidden === true;
        }).length,
        images: images.length,
        referencedImages: images.filter((image) => image.references.length > 0).length,
        unreferencedImages: images.filter((image) => image.references.length === 0).length,
        specialtyMappings: specialtyMappings.length,
        specialtyColumns: new Set(specialtyMappings.map((mapping) => mapping.column)).size,
      },
      validation: { valid: validation.valid, output: validation.output },
    };
  }

  async validateDrafts(
    input: readonly CatalogStudioDraftFile[],
  ): Promise<CatalogStudioValidationResult> {
    await recoverInterruptedTransaction();
    const drafts = await normalizeDrafts(input);
    const staged = await stageDrafts(drafts);
    try {
      const result = await runValidator(staged.stagedCatalogRoot);
      return { ...result, changedFiles: drafts.map((draft) => draft.path) };
    } finally {
      await rm(staged.temporaryRoot, { recursive: true, force: true });
    }
  }

  async saveDrafts(input: readonly CatalogStudioDraftFile[]): Promise<CatalogStudioSaveResult> {
    if (saveBusy) throw new Error("catalogStudioSaveBusy");
    saveBusy = true;
    try {
      await recoverInterruptedTransaction();
      const drafts = await normalizeDrafts(input);
      const currentFiles = fileMap(await loadCatalogFiles());
      for (const draft of drafts) {
        if (currentFiles.get(draft.path)?.hash !== draft.baseHash) {
          throw new Error(`catalogStudioConcurrentChange:${draft.path}`);
        }
      }

      const staged = await stageDrafts(drafts);
      try {
        const validation = await runValidator(staged.stagedCatalogRoot);
        if (!validation.valid) {
          return {
            ...validation,
            changedFiles: drafts.map((draft) => draft.path),
            saved: false,
            revision: snapshotRevision([...currentFiles.values()]),
            auditEntry: {
              at: new Date().toISOString(),
              action: "save",
              files: drafts.map((draft) => draft.path),
              details: "Validation failed; canonical files were not changed.",
            },
          };
        }

        const transactionId = randomUUID();
        const backupRoot = path.join(transactionRoot, transactionId, "catalog");
        await mkdir(backupRoot, { recursive: true });
        for (const draft of drafts) {
          const source = resolveInside(catalogRoot, draft.path);
          const backup = resolveInside(backupRoot, draft.path);
          await mkdir(path.dirname(backup), { recursive: true });
          await cp(source, backup);
        }
        const journal: TransactionJournal = {
          id: transactionId,
          files: drafts.map((draft) => draft.path),
          backupRoot,
          state: "prepared",
        };
        await writeJsonAtomic(journalPath, journal);
        journal.state = "committing";
        await writeJsonAtomic(journalPath, journal);

        try {
          for (const draft of drafts) {
            const target = resolveInside(catalogRoot, draft.path);
            const temporary = `${target}.${transactionId}.tmp`;
            await writeFile(temporary, draft.content, "utf8");
            await rename(temporary, target);
          }
          const postValidation = await runValidator(catalogRoot);
          if (!postValidation.valid) {
            throw new Error(`catalogStudioPostValidationFailed:${postValidation.output}`);
          }
        } catch (error) {
          await restoreJournal(journal);
          throw error;
        }

        await rm(journalPath, { force: true });
        await rm(path.join(transactionRoot, transactionId), { recursive: true, force: true });
        const auditEntry: CatalogStudioAuditEntry = {
          at: new Date().toISOString(),
          action: "save",
          files: drafts.map((draft) => draft.path),
          details: `Validated and atomically committed ${drafts.length} Catalog file(s).`,
        };
        await appendAudit(auditEntry);
        const nextFiles = await loadCatalogFiles();
        return {
          valid: true,
          output: validation.output,
          changedFiles: drafts.map((draft) => draft.path),
          saved: true,
          revision: snapshotRevision(nextFiles),
          auditEntry,
        };
      } finally {
        await rm(staged.temporaryRoot, { recursive: true, force: true });
      }
    } finally {
      saveBusy = false;
    }
  }

  async uploadImage(input: {
    root: CatalogStudioImageRoot;
    fileName: string;
    bytes: Uint8Array;
    replace: boolean;
  }): Promise<CatalogStudioAuditEntry> {
    await recoverInterruptedTransaction();
    const fileName = path.basename(input.fileName).trim();
    if (!fileName || fileName !== input.fileName || /[\\/]/.test(fileName)) {
      throw new Error("catalogStudioImageNameInvalid");
    }
    const extension = path.extname(fileName).toLowerCase();
    if (!IMAGE_EXTENSIONS.has(extension)) throw new Error("catalogStudioImageTypeInvalid");
    if (input.bytes.byteLength === 0 || input.bytes.byteLength > MAX_IMAGE_BYTES) {
      throw new Error("catalogStudioImageSizeInvalid");
    }
    assertImageBytes(input.bytes, extension);
    const roots = await currentImageRoots();
    const directory = roots[input.root];
    await mkdir(directory, { recursive: true });
    const target = resolveInside(directory, fileName);
    let exists = false;
    try {
      await stat(target);
      exists = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    if (exists && !input.replace) throw new Error("catalogStudioImageAlreadyExists");

    let recoveryPath: string | undefined;
    if (exists) {
      const backup = path.join(
        stateRoot,
        "backups",
        "images",
        `${Date.now()}-${randomUUID()}-${fileName}`,
      );
      await mkdir(path.dirname(backup), { recursive: true });
      await cp(target, backup);
      recoveryPath = normalizeRelative(path.relative(workspaceRoot, backup));
    }
    const temporary = `${target}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporary, input.bytes);
      await rename(temporary, target);
    } catch (error) {
      await rm(temporary, { force: true });
      throw error;
    }
    const entry: CatalogStudioAuditEntry = {
      at: new Date().toISOString(),
      action: exists ? "replace-image" : "upload-image",
      files: [normalizeRelative(path.relative(publicRoot, target))],
      details: exists ? "Replaced an image after preserving a recovery copy." : "Uploaded a new image.",
      recoveryPath,
    };
    await appendAudit(entry);
    return entry;
  }

  async trashImage(relativePath: string): Promise<CatalogStudioAuditEntry> {
    await recoverInterruptedTransaction();
    const normalized = normalizeRelative(relativePath);
    const roots = await currentImageRoots();
    const target = resolveInside(publicRoot, normalized);
    if (!Object.values(roots).some((root) => target.startsWith(`${root}${path.sep}`))) {
      throw new Error("catalogStudioImagePathUnmanaged");
    }
    const files = fileMap(await loadCatalogFiles());
    const image = (await buildImages(files)).find((candidate) => candidate.path === normalized);
    if (!image) throw new Error("catalogStudioImageMissing");
    if (image.references.length > 0) {
      throw new Error(`catalogStudioImageReferenced:${image.references.join(",")}`);
    }
    const trash = path.join(
      stateRoot,
      "trash",
      "images",
      `${Date.now()}-${randomUUID()}-${path.basename(normalized)}`,
    );
    await mkdir(path.dirname(trash), { recursive: true });
    await rename(target, trash);
    const entry: CatalogStudioAuditEntry = {
      at: new Date().toISOString(),
      action: "trash-image",
      files: [normalized],
      details: "Moved an unreferenced image to the recoverable developer trash.",
      recoveryPath: normalizeRelative(path.relative(workspaceRoot, trash)),
    };
    await appendAudit(entry);
    return entry;
  }
}

export const catalogStudioService = new CatalogStudioService();
