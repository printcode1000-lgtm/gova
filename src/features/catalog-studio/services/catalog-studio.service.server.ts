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
} from "../domain/catalog-studio.types";

const execFileAsync = promisify(execFile);
const workspaceRoot = process.cwd();
const publicRoot = path.join(workspaceRoot, "public");
const catalogRoot = path.join(publicRoot, "catagory");
const stateRoot = path.join(workspaceRoot, ".catalog-studio");
const auditPath = path.join(stateRoot, "audit.jsonl");
const journalPath = path.join(stateRoot, "active-transaction.json");
const transactionRoot = path.join(stateRoot, "transactions");
const validatorPath = path.join(workspaceRoot, "scripts", "validate-catalog.ts");
const tsxCliPath = path.join(workspaceRoot, "node_modules", "tsx", "dist", "cli.mjs");
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

type JsonRecord = Record<string, unknown>;
type FileMap = Map<string, CatalogStudioFile>;

interface ImageRoots {
  mainCategories: string;
  subcategories: string;
  pharmacy: string;
  vehicles: string;
}

interface TransactionJournal {
  id: string;
  files: string[];
  backupRoot: string;
  state: "prepared" | "committing";
}

let saveBusy = false;

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeRelative(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\/+/, "");
}

function resolveInside(root: string, relativePath: string): string {
  const normalized = normalizeRelative(relativePath);
  const resolved = path.resolve(root, normalized);
  const rootWithSeparator = `${path.resolve(root)}${path.sep}`;
  if (!resolved.startsWith(rootWithSeparator)) {
    throw new Error("catalogStudioUnsafePath");
  }
  return resolved;
}

function fileGroup(relativePath: string): CatalogStudioGroup {
  if (relativePath === "manifest.json") return "manifest";
  if (relativePath.startsWith("core/")) return "core";
  if (relativePath.startsWith("pharmacy/")) return "pharmacy";
  if (relativePath.startsWith("vehicles/")) return "vehicles";
  return "schemas";
}

function parseJson(content: string, relativePath: string): JsonRecord {
  try {
    const value: unknown = JSON.parse(content);
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("root must be an object");
    }
    return value as JsonRecord;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`catalogStudioInvalidJson:${relativePath}:${message}`);
  }
}

function formattedJson(content: string, relativePath: string): string {
  return `${JSON.stringify(parseJson(content, relativePath), null, 2)}\n`;
}

function itemArray(value: JsonRecord): { key: "items" | "mappings" | null; items: JsonRecord[] } {
  if (Array.isArray(value.items)) return { key: "items", items: value.items as JsonRecord[] };
  if (Array.isArray(value.mappings)) {
    return { key: "mappings", items: value.mappings as JsonRecord[] };
  }
  return { key: null, items: [] };
}

async function walkFiles(root: string): Promise<string[]> {
  const result: string[] = [];
  async function visit(directory: string) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(fullPath);
      else if (entry.isFile()) result.push(fullPath);
    }
  }
  await visit(root);
  return result;
}

async function loadCatalogFiles(root = catalogRoot): Promise<CatalogStudioFile[]> {
  const paths = (await walkFiles(root))
    .filter((filePath) => filePath.toLowerCase().endsWith(".json"))
    .sort((left, right) => left.localeCompare(right, "en"));
  return Promise.all(
    paths.map(async (filePath) => {
      const relativePath = normalizeRelative(path.relative(root, filePath));
      const content = await readFile(filePath, "utf8");
      const parsed = parseJson(content, relativePath);
      const items = itemArray(parsed);
      return {
        path: relativePath,
        group: fileGroup(relativePath),
        content,
        hash: sha256(content),
        readOnly: relativePath.startsWith("schemas/"),
        itemKey: items.key,
        itemCount: items.items.length,
      } satisfies CatalogStudioFile;
    }),
  );
}

function fileMap(files: readonly CatalogStudioFile[]): FileMap {
  return new Map(files.map((file) => [file.path, file]));
}

function parsedFile(files: FileMap, relativePath: string): JsonRecord {
  const file = files.get(relativePath);
  if (!file) throw new Error(`catalogStudioFileMissing:${relativePath}`);
  return parseJson(file.content, relativePath);
}

function parsedItems(files: FileMap, relativePath: string): JsonRecord[] {
  return itemArray(parsedFile(files, relativePath)).items;
}

function itemIdentity(item: JsonRecord): string {
  const identity = item.id ?? item.key ?? item.column ?? "unknown";
  return String(identity);
}

function itemNode(relativePath: string, item: JsonRecord): string {
  return `${relativePath}#${itemIdentity(item)}`;
}

function buildRelations(files: FileMap): CatalogStudioRelation[] {
  const relations: CatalogStudioRelation[] = [];
  const push = (
    kind: CatalogStudioRelation["kind"],
    from: string,
    to: string,
    label: string,
  ) => relations.push({ kind, from, to, label });

  for (const item of parsedItems(files, "core/subcategories.json")) {
    push(
      "parent",
      itemNode("core/categories.json", { id: item.categoryId }),
      itemNode("core/subcategories.json", item),
      "تصنيف رئيسي ← تصنيف فرعي",
    );
  }
  for (const collection of parsedItems(files, "core/collections.json")) {
    for (const memberId of (collection.memberCategoryIds as unknown[]) ?? []) {
      push(
        "collection-member",
        itemNode("core/collections.json", collection),
        itemNode("core/categories.json", { id: memberId }),
        "عضو مجموعة",
      );
    }
  }
  for (const mapping of parsedItems(files, "core/specialty-columns.json")) {
    push(
      "database-column",
      itemNode("core/specialty-columns.json", { id: mapping.key }),
      `database:profile-core.user_specialties#${String(mapping.column)}`,
      "عمود user_specialties",
    );
  }
  for (const item of parsedItems(files, "pharmacy/subcategories.json")) {
    push(
      "parent",
      itemNode("pharmacy/categories.json", { id: item.categoryId }),
      itemNode("pharmacy/subcategories.json", item),
      "قسم صيدلية ← تصنيف فرعي",
    );
  }
  for (const ingredient of parsedItems(files, "pharmacy/ingredients.json")) {
    const ingredientNode = itemNode("pharmacy/ingredients.json", ingredient);
    push(
      "parent",
      itemNode("pharmacy/subcategories.json", { id: ingredient.subcategoryId }),
      ingredientNode,
      "تصنيف صيدلية ← مادة فعالة",
    );
    for (const formId of (ingredient.formIds as unknown[]) ?? []) {
      push(
        "form",
        ingredientNode,
        itemNode("pharmacy/forms.json", { id: formId }),
        "شكل دوائي",
      );
    }
    for (const strengthId of (ingredient.strengthIds as unknown[]) ?? []) {
      push(
        "strength",
        ingredientNode,
        itemNode("pharmacy/strengths.json", { id: strengthId }),
        "تركيز",
      );
    }
  }
  for (const group of parsedItems(files, "vehicles/groups.json")) {
    push(
      "option-file",
      itemNode("vehicles/groups.json", group),
      String(group.optionFile),
      "ملف خيارات المركبة",
    );
  }
  return relations;
}

function manifestImageRoots(files: FileMap): ImageRoots {
  const manifest = parsedFile(files, "manifest.json");
  const assets = manifest.assets as JsonRecord;
  return {
    mainCategories: String(assets.mainCategories),
    subcategories: String(assets.subcategories),
    pharmacy: String(assets.pharmacy),
    vehicles: String(assets.vehicles),
  };
}

function publicUrl(root: string, fileName: string): string {
  return `${root.replace(/\/$/, "")}/${fileName.replace(/^\/+/, "")}`;
}

function buildImageReferenceMap(files: FileMap): Map<string, string[]> {
  const roots = manifestImageRoots(files);
  const references = new Map<string, string[]>();
  const add = (url: string, node: string) => {
    const normalized = `/${normalizeRelative(url)}`;
    const current = references.get(normalized) ?? [];
    current.push(node);
    references.set(normalized, current);
  };
  for (const item of parsedItems(files, "core/categories.json")) {
    add(publicUrl(roots.mainCategories, String(item.image)), itemNode("core/categories.json", item));
  }
  for (const item of parsedItems(files, "core/collections.json")) {
    add(publicUrl(roots.mainCategories, String(item.image)), itemNode("core/collections.json", item));
  }
  for (const item of parsedItems(files, "core/subcategories.json")) {
    add(publicUrl(roots.subcategories, String(item.image)), itemNode("core/subcategories.json", item));
  }
  for (const item of parsedItems(files, "pharmacy/ingredients.json")) {
    add(String(item.imagePath), itemNode("pharmacy/ingredients.json", item));
  }
  for (const group of parsedItems(files, "vehicles/groups.json")) {
    const optionPath = String(group.optionFile);
    for (const option of parsedItems(files, optionPath)) {
      if (option.image) {
        add(publicUrl(roots.vehicles, String(option.image)), itemNode(optionPath, option));
      }
    }
  }
  return references;
}

async function buildImages(files: FileMap): Promise<CatalogStudioImage[]> {
  const roots = manifestImageRoots(files);
  const references = buildImageReferenceMap(files);
  const records: CatalogStudioImage[] = [];
  for (const [rootKey, rootUrl] of Object.entries(roots) as Array<
    [CatalogStudioImageRoot, string]
  >) {
    const directory = resolveInside(publicRoot, rootUrl);
    const imageFiles = await walkFiles(directory);
    for (const imagePath of imageFiles) {
      const relativeFromRoot = normalizeRelative(path.relative(directory, imagePath));
      const url = publicUrl(rootUrl, relativeFromRoot);
      const contents = await readFile(imagePath);
      records.push({
        path: normalizeRelative(path.relative(publicRoot, imagePath)),
        publicUrl: url,
        root: rootKey,
        size: contents.byteLength,
        hash: sha256(contents),
        references: [...(references.get(url) ?? [])].sort(),
      });
    }
  }
  return records.sort((left, right) => left.path.localeCompare(right.path, "en"));
}

async function runValidator(targetCatalogRoot: string): Promise<CatalogStudioValidationResult> {
  try {
    const result = await execFileAsync(process.execPath, [tsxCliPath, validatorPath], {
      cwd: workspaceRoot,
      env: catalogStudioChildProcessEnv({
        ASOL_CATALOG_ROOT: targetCatalogRoot,
        ASOL_CATALOG_PUBLIC_ROOT: publicRoot,
      }),
      maxBuffer: 8 * 1024 * 1024,
      windowsHide: true,
    });
    return {
      valid: true,
      output: [result.stdout, result.stderr].filter(Boolean).join("\n").trim(),
      changedFiles: [],
    };
  } catch (error) {
    const failure = error as Error & { stdout?: string; stderr?: string };
    return {
      valid: false,
      output: [failure.stdout, failure.stderr, failure.message].filter(Boolean).join("\n").trim(),
      changedFiles: [],
    };
  }
}

async function readAudit(): Promise<CatalogStudioAuditEntry[]> {
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

async function appendAudit(entry: CatalogStudioAuditEntry): Promise<void> {
  await mkdir(stateRoot, { recursive: true });
  await appendFile(auditPath, `${JSON.stringify(entry)}\n`, "utf8");
}

async function writeJsonAtomic(targetPath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(targetPath), { recursive: true });
  const temporaryPath = `${targetPath}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporaryPath, targetPath);
}

async function restoreJournal(journal: TransactionJournal): Promise<void> {
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

async function recoverInterruptedTransaction(): Promise<void> {
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

function snapshotRevision(files: readonly CatalogStudioFile[]): string {
  return sha256(
    files
      .map((file) => `${file.path}:${file.hash}`)
      .sort()
      .join("\n"),
  );
}

async function stageDrafts(drafts: readonly CatalogStudioDraftFile[]) {
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

async function normalizeDrafts(
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

async function currentImageRoots(): Promise<Record<CatalogStudioImageRoot, string>> {
  const files = fileMap(await loadCatalogFiles());
  const roots = manifestImageRoots(files);
  return {
    mainCategories: resolveInside(publicRoot, roots.mainCategories),
    subcategories: resolveInside(publicRoot, roots.subcategories),
    pharmacy: resolveInside(publicRoot, roots.pharmacy),
    vehicles: resolveInside(publicRoot, roots.vehicles),
  };
}

function assertImageBytes(buffer: Uint8Array, extension: string): void {
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
