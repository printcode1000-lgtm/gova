import type { SpecialtyDeleteDialogState } from "./SpecialtiesDeleteDialog";

export function specialtyDeleteImpactPairs({
  deleteDialog,
  selectedSubcategories,
}: {
  deleteDialog: SpecialtyDeleteDialogState;
  selectedSubcategories: Record<string, string[]>;
}) {
  return deleteDialog.subcategoryId
    ? [[deleteDialog.categoryId, deleteDialog.subcategoryId]]
    : (selectedSubcategories[deleteDialog.categoryId] ?? []).map((subId) => [
        deleteDialog.categoryId,
        subId,
      ]);
}
