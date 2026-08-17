import path from "node:path";

export const PRODUCT_STYLE_DIRECTORY_SEGMENTS = ["public", "product", "style"] as const;
export const PRODUCT_STYLE_INDEX_FILE = "index.json";
export const PRODUCT_STYLE_DEFAULT_FILE = "default.json";
export const PRODUCT_STYLE_FILE_PATTERN = /^([a-z0-9-]+)__([a-z0-9-]+)\.json$/i;

export function resolveProductStyleDirectory(workspaceRoot: string): string {
  return path.join(workspaceRoot, ...PRODUCT_STYLE_DIRECTORY_SEGMENTS);
}

export function resolveProductStyleIndexPath(workspaceRoot: string): string {
  return path.join(resolveProductStyleDirectory(workspaceRoot), PRODUCT_STYLE_INDEX_FILE);
}

export function resolveProductStyleFilePath(
  workspaceRoot: string,
  mainCategoryId: string,
  subcategoryId: string,
): string {
  return path.join(
    resolveProductStyleDirectory(workspaceRoot),
    `${mainCategoryId}__${subcategoryId}.json`,
  );
}

export function resolveProductStyleDefaultPath(workspaceRoot: string): string {
  return path.join(
    resolveProductStyleDirectory(workspaceRoot),
    PRODUCT_STYLE_DEFAULT_FILE,
  );
}
