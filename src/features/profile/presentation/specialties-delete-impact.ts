export interface SpecialtyRemoval {
  categoryId: string;
  subcategoryId?: string;
}

export function specialtyDeleteImpactPairs({
  removal,
  selectedSubcategories,
}: {
  removal: SpecialtyRemoval;
  selectedSubcategories: Record<string, string[]>;
}) {
  return removal.subcategoryId
    ? [[removal.categoryId, removal.subcategoryId]]
    : (selectedSubcategories[removal.categoryId] ?? []).map((subId) => [
        removal.categoryId,
        subId,
      ]);
}
