import type { PageSaveItemInput } from "@asol/page-save-core";

import {
  buildPageSaveOperationDescription,
  type PageSaveOperation,
} from "./page-save-operation-description";

export function buildImageUploadPageSaveItem(input: {
  id: string;
  label: string;
  hasPending: boolean;
  hasPendingUpload?: boolean;
  hasPendingDelete?: boolean;
  canSave?: boolean;
  description?: string;
  t?: (key: string) => string;
}): PageSaveItemInput {
  const hasUpload = input.hasPendingUpload ?? input.hasPending;
  const hasDelete = input.hasPendingDelete ?? false;
  const operations: PageSaveOperation[] = [];
  if (hasUpload) operations.push("upload");
  if (hasDelete) operations.push("delete");

  return {
    id: input.id,
    label: input.label,
    isDirty: input.hasPending || hasDelete,
    canSave: input.canSave ?? true,
    description:
      input.description ??
      (input.t && operations.length > 0
        ? buildPageSaveOperationDescription(input.t, operations)
        : undefined),
  };
}
