import type { CatalogDisplay } from '../domain/catalog-v3.types';

type DisplayableCatalogItem = { display: CatalogDisplay };

function compareStableKeys(left: string | number, right: string | number): number {
  if (typeof left === 'number' && typeof right === 'number') return left - right;
  const leftKey = String(left);
  const rightKey = String(right);
  return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
}

export function isCatalogItemVisible(
  item: DisplayableCatalogItem,
  ...ancestors: readonly DisplayableCatalogItem[]
): boolean {
  return !item.display.hidden && ancestors.every((ancestor) => !ancestor.display.hidden);
}

export function visibleCatalogItems<T extends DisplayableCatalogItem>(
  items: readonly T[],
  stableKey: (item: T) => string | number,
): T[] {
  return items
    .filter((item) => isCatalogItemVisible(item))
    .sort(
      (left, right) =>
        left.display.order - right.display.order ||
        compareStableKeys(stableKey(left), stableKey(right)),
    );
}
