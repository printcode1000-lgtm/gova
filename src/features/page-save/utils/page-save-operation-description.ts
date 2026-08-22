import type { PageSaveItemState, PageSaveOperationKind } from "@asol/page-save-core";

export type PageSaveOperation = PageSaveOperationKind;

export function buildPageSaveOperationDescription(
  t: (key: string) => string,
  operations: PageSaveOperation[],
): string {
  const unique = [...new Set(operations)];
  return unique
    .map((operation) => {
      if (operation === "upload") return t("pageSave.operation.upload");
      if (operation === "delete") return t("pageSave.operation.delete");
      return t("pageSave.operation.save");
    })
    .join(" · ");
}

/** Falls back to the item's operation kind so pages never author save copy. */
export function describePageSaveItem(
  t: (key: string) => string,
  item: Pick<PageSaveItemState, "description" | "operation">,
): string {
  return (
    item.description ?? buildPageSaveOperationDescription(t, [item.operation])
  );
}
