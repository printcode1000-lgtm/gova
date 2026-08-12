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

export const execFileAsync = promisify(execFile);

export const workspaceRoot = process.cwd();

export const publicRoot = path.join(workspaceRoot, "public");

export const catalogRoot = path.join(publicRoot, "catagory");

export const stateRoot = path.join(workspaceRoot, ".catalog-studio");

export const auditPath = path.join(stateRoot, "audit.jsonl");

export const journalPath = path.join(stateRoot, "active-transaction.json");

export const transactionRoot = path.join(stateRoot, "transactions");

export const validatorPath = path.join(workspaceRoot, "scripts", "validate-catalog.ts");

export const tsxCliPath = path.join(workspaceRoot, "node_modules", "tsx", "dist", "cli.mjs");

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

export type JsonRecord = Record<string, unknown>;

export type FileMap = Map<string, CatalogStudioFile>;

export interface ImageRoots {
  mainCategories: string;
  subcategories: string;
  pharmacy: string;
  vehicles: string;
}

export interface TransactionJournal {
  id: string;
  files: string[];
  backupRoot: string;
  state: "prepared" | "committing";
}

export function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

export function normalizeRelative(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\/+/, "");
}

export function resolveInside(root: string, relativePath: string): string {
  const normalized = normalizeRelative(relativePath);
  const resolved = path.resolve(root, normalized);
  const rootWithSeparator = `${path.resolve(root)}${path.sep}`;
  if (!resolved.startsWith(rootWithSeparator)) {
    throw new Error("catalogStudioUnsafePath");
  }
  return resolved;
}

export function fileGroup(relativePath: string): CatalogStudioGroup {
  if (relativePath === "manifest.json") return "manifest";
  if (relativePath.startsWith("core/")) return "core";
  if (relativePath.startsWith("pharmacy/")) return "pharmacy";
  if (relativePath.startsWith("vehicles/")) return "vehicles";
  return "schemas";
}

export function parseJson(content: string, relativePath: string): JsonRecord {
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

export function formattedJson(content: string, relativePath: string): string {
  return `${JSON.stringify(parseJson(content, relativePath), null, 2)}\n`;
}

export function itemArray(value: JsonRecord): { key: "items" | "mappings" | null; items: JsonRecord[] } {
  if (Array.isArray(value.items)) return { key: "items", items: value.items as JsonRecord[] };
  if (Array.isArray(value.mappings)) {
    return { key: "mappings", items: value.mappings as JsonRecord[] };
  }
  return { key: null, items: [] };
}

export async function walkFiles(root: string): Promise<string[]> {
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

export async function loadCatalogFiles(root = catalogRoot): Promise<CatalogStudioFile[]> {
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

export function fileMap(files: readonly CatalogStudioFile[]): FileMap {
  return new Map(files.map((file) => [file.path, file]));
}

export function parsedFile(files: FileMap, relativePath: string): JsonRecord {
  const file = files.get(relativePath);
  if (!file) throw new Error(`catalogStudioFileMissing:${relativePath}`);
  return parseJson(file.content, relativePath);
}

export function parsedItems(files: FileMap, relativePath: string): JsonRecord[] {
  return itemArray(parsedFile(files, relativePath)).items;
}

export function itemIdentity(item: JsonRecord): string {
  const identity = item.id ?? item.key ?? item.column ?? "unknown";
  return String(identity);
}

export function itemNode(relativePath: string, item: JsonRecord): string {
  return `${relativePath}#${itemIdentity(item)}`;
}

export function buildRelations(files: FileMap): CatalogStudioRelation[] {
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

export function manifestImageRoots(files: FileMap): ImageRoots {
  const manifest = parsedFile(files, "manifest.json");
  const assets = manifest.assets as JsonRecord;
  return {
    mainCategories: String(assets.mainCategories),
    subcategories: String(assets.subcategories),
    pharmacy: String(assets.pharmacy),
    vehicles: String(assets.vehicles),
  };
}

export function publicUrl(root: string, fileName: string): string {
  return `${root.replace(/\/$/, "")}/${fileName.replace(/^\/+/, "")}`;
}

export function buildImageReferenceMap(files: FileMap): Map<string, string[]> {
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

export async function buildImages(files: FileMap): Promise<CatalogStudioImage[]> {
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

export async function runValidator(targetCatalogRoot: string): Promise<CatalogStudioValidationResult> {
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
