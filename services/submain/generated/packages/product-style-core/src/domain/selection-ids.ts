const SAFE_SELECTION_ID = /^[a-z0-9-]+$/i;

export function isSafeProductStyleSelectionId(value: string): boolean {
  return value.length > 0 && SAFE_SELECTION_ID.test(value);
}

export function productStyleFileName(
  mainCategoryId: string,
  subcategoryId: string,
): string {
  return `${mainCategoryId}__${subcategoryId}.json`;
}

export function productStylePublicPath(
  mainCategoryId: string,
  subcategoryId: string,
): string {
  return `/product/style/${productStyleFileName(mainCategoryId, subcategoryId)}`;
}
