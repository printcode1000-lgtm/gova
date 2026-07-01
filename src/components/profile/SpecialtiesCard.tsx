"use client";

import * as React from "react";
import { useTranslation } from "@/lib/i18n";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { govaApi } from "@/core/api";
import type {
  ProfileSectionStatus,
  ProfileSpecialtiesController,
} from "./profile-save-controller";

interface Category {
  id: number;
  title_ar: string;
  title_en: string;
  icon: string;
  image: string;
  created_at: string;
  updated_at: string;
  collection: number | null;
  collection_ar: string | null;
  collection_en: string | null;
  collection_image: string | null;
  order: number | null;
}

interface SpecialtiesCardProps {
  showSaveButton?: boolean;
  onStatusChange?: (status: ProfileSectionStatus) => void;
  readOnly?: boolean;
}

export const SpecialtiesCard = React.forwardRef<
  ProfileSpecialtiesController,
  SpecialtiesCardProps
>(function SpecialtiesCard({ onStatusChange, readOnly = false }, ref) {
  const { t, locale } = useTranslation();
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [selectedSpecialties, setSelectedSpecialties] = React.useState<
    string[]
  >([]);
  const [isDirty, setIsDirty] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const label = t("onboarding.storeIdentity.specialties");

  React.useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await govaApi.getPublicJson<Category[]>(
          "/catagory/categories.json",
        );

        // Sort categories by order
        const sortedData = [...data].sort((a, b) => {
          const orderA = a.order ?? Infinity;
          const orderB = b.order ?? Infinity;
          return orderA - orderB;
        });

        setCategories(sortedData);
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);

  React.useImperativeHandle(
    ref,
    () => ({
      isDirty,
      isSaving: false,
      canSave: true,
      label,
      save: async () => true,
      getSnapshot: () => ({ specialties: selectedSpecialties }),
      applySaved: () => {},
    }),
    [isDirty, label, selectedSpecialties],
  );

  React.useEffect(() => {
    onStatusChange?.({ isDirty, isSaving: false, canSave: true, label });
  }, [isDirty, label, onStatusChange]);

  const handleSpecialtyToggle = (categoryId: string) => {
    setSelectedSpecialties((prev) => {
      const newSpecialties = prev.includes(categoryId)
        ? prev.filter((s) => s !== categoryId)
        : [...prev, categoryId];
      setIsDirty(true);
      return newSpecialties;
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-on-surface mb-2">
          {t("onboarding.storeIdentity.specialties")}
        </h3>
        <p className="text-xs text-on-surface-variant mb-4">
          {t("onboarding.storeIdentity.specialtiesHint")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 sm:grid-cols-3">
        {categories.map((category) => {
          const categoryId = category.id.toString();
          const categoryName =
            locale === "ar" ? category.title_ar : category.title_en;

          return (
            <div
              key={category.id}
              className="flex min-h-11 items-center gap-2 rounded-lg border border-outline-variant/50 px-3 py-2"
            >
              <Checkbox
                id={categoryId}
                checked={selectedSpecialties.includes(categoryId)}
                onCheckedChange={() => handleSpecialtyToggle(categoryId)}
                disabled={readOnly}
              />
              <Label
                htmlFor={categoryId}
                className="min-w-0 cursor-pointer break-words text-sm peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {categoryName}
              </Label>
            </div>
          );
        })}
      </div>

      {selectedSpecialties.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {t("profile.selected")}: {selectedSpecialties.length}
        </p>
      )}
    </div>
  );
});

export default SpecialtiesCard;
