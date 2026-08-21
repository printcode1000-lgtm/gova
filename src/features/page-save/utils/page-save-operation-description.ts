export type PageSaveOperation = "upload" | "delete" | "save";

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
