import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";

import { normalizeProductStyleComponents } from "../domain/style-defaults";
import { productStyleFileName } from "../domain/selection-ids";
import {
  parseProductStyleSettings,
  isValidProductStyleSettings,
} from "../domain/style-validation";
import type { ProductStyleSettings } from "../domain/style-types";
import {
  PRODUCT_STYLE_FILE_PATTERN,
  PRODUCT_STYLE_INDEX_FILE,
  resolveProductStyleDirectory,
  resolveProductStyleDefaultPath,
  resolveProductStyleFilePath,
  resolveProductStyleIndexPath,
} from "./paths";

export async function readProductStyleSettings(
  workspaceRoot: string,
  mainCategoryId: string,
  subcategoryId: string,
): Promise<ProductStyleSettings | null> {
  try {
    const content = await readFile(
      resolveProductStyleFilePath(workspaceRoot, mainCategoryId, subcategoryId),
      "utf8",
    );
    return parseProductStyleSettings(JSON.parse(content));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function readProductStyleSettingsOrDefault(
  workspaceRoot: string,
  mainCategoryId: string,
  subcategoryId: string,
): Promise<ProductStyleSettings | null> {
  const custom = await readProductStyleSettings(
    workspaceRoot,
    mainCategoryId,
    subcategoryId,
  );
  if (custom) return custom;
  try {
    const content = await readFile(resolveProductStyleDefaultPath(workspaceRoot), "utf8");
    const parsed = parseProductStyleSettings(JSON.parse(content));
    if (!parsed) return null;
    return {
      ...parsed,
      mainCategoryId,
      subcategoryId,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function writeProductStyleSettings(
  workspaceRoot: string,
  settings: ProductStyleSettings,
): Promise<void> {
  if (!isValidProductStyleSettings(settings)) {
    throw new Error("invalidProductStyleSettings");
  }
  const directory = resolveProductStyleDirectory(workspaceRoot);
  await mkdir(directory, { recursive: true });
  const filePath = resolveProductStyleFilePath(
    workspaceRoot,
    settings.mainCategoryId,
    settings.subcategoryId,
  );
  const temporaryPath = `${filePath}.${Date.now()}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
  await rename(temporaryPath, filePath);
  await rebuildProductStyleIndex(workspaceRoot);
}

export async function rebuildProductStyleIndex(workspaceRoot: string): Promise<void> {
  const styleDirectory = resolveProductStyleDirectory(workspaceRoot);
  const indexPath = resolveProductStyleIndexPath(workspaceRoot);
  const fileNames = await readdir(styleDirectory);
  const files = fileNames
    .map((file) => {
      const match = PRODUCT_STYLE_FILE_PATTERN.exec(file);
      if (!match || file === PRODUCT_STYLE_INDEX_FILE) return null;
      return {
        mainCategoryId: match[1],
        subcategoryId: match[2],
        file,
        path: `/product/style/${file}`,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .sort((left, right) => left.file.localeCompare(right.file, "en"));

  const temporaryIndexPath = `${indexPath}.${Date.now()}.tmp`;
  await writeFile(
    temporaryIndexPath,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), files }, null, 2)}\n`,
    "utf8",
  );
  await rename(temporaryIndexPath, indexPath);
}

export async function readNormalizedStyleComponents(
  workspaceRoot: string,
  mainCategoryId: string,
  subcategoryId: string,
) {
  const settings = await readProductStyleSettingsOrDefault(
    workspaceRoot,
    mainCategoryId,
    subcategoryId,
  );
  return normalizeProductStyleComponents(settings?.components);
}

export { productStyleFileName };
