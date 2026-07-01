"use client";

import * as React from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { govaApi } from "@/core/api";
import type {
  ProfileSectionStatus,
  ProfileSpecialtiesController,
} from "./profile-save-controller";

/**
 * EXCEPTIONAL CATEGORIES:
 * 
 * 1. Beauty Store (Collection Type):
 *    - This is a collection category that contains individual categories as sub-items
 *    - When selected, it shows its collection items (e.g., "May Way", "Oriflame", "Avon") as subcategories
 *    - Collection items are fetched from categories.json where collection === category_id
 *    - Images for collection items use /images/mainCategories/ path
 * 
 * 2. Delivery Services (ID: 46):
 *    - This is an exceptional category that should NOT open a subcategory dialog
 *    - When clicked, it behaves like a normal main category (toggle selection only)
 *    - It can be selected and saved in profile.selected without any subcategories
 *    - Handled in handleCategoryClick with an explicit check for category.id === 46
 */

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

interface Subcategory {
  id: number;
  category_id: number;
  original_id: number;
  title_ar: string;
  title_en: string;
  icon: string;
  image: string;
  created_at: string;
  updated_at: string;
}

interface DisplayCategory {
  id: number;
  name_ar: string;
  name_en: string;
  image: string;
  isCollection: boolean;
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
  const [displayCategories, setDisplayCategories] = React.useState<DisplayCategory[]>([]);
  const [selectedSpecialties, setSelectedSpecialties] = React.useState<
    string[]
  >([]);
  const [selectedSubcategories, setSelectedSubcategories] = React.useState<
    Record<string, string[]>
  >({});
  const [isDirty, setIsDirty] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [selectedCategoryForDialog, setSelectedCategoryForDialog] =
    React.useState<DisplayCategory | null>(null);
  const [subcategories, setSubcategories] = React.useState<Subcategory[]>([]);
  const [isLoadingSubcategories, setIsLoadingSubcategories] =
    React.useState(false);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
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

        // Group categories by collection
        const collectionMap = new Map<number | null, Category[]>();

        sortedData.forEach((cat) => {
          const key = cat.collection;
          if (!collectionMap.has(key)) {
            collectionMap.set(key, []);
          }
          collectionMap.get(key)!.push(cat);
        });

        // Convert to display categories
        const displayCats: DisplayCategory[] = [];

        // Add individual categories (collection === null)
        const individualCats = collectionMap.get(null) || [];
        individualCats.forEach((cat) => {
          displayCats.push({
            id: cat.id,
            name_ar: cat.title_ar,
            name_en: cat.title_en,
            image: cat.image,
            isCollection: false,
            order: cat.order,
          });
        });

        // Add collections (collection !== null)
        const collectionKeys = Array.from(collectionMap.keys()).filter(
          (key) => key !== null,
        );
        collectionKeys.forEach((collectionKey) => {
          const cats = collectionMap.get(collectionKey) || [];
          const firstCat = cats[0];
          displayCats.push({
            id: collectionKey,
            name_ar: firstCat.collection_ar || "",
            name_en: firstCat.collection_en || "",
            image: firstCat.collection_image || "",
            isCollection: true,
            order: firstCat.order,
          });
        });

        // Sort all display categories by order
        displayCats.sort((a, b) => {
          const orderA = a.order ?? Infinity;
          const orderB = b.order ?? Infinity;
          return orderA - orderB;
        });

        setDisplayCategories(displayCats);
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
      getSnapshot: () => ({ 
        specialties: selectedSpecialties,
        subcategories: Object.entries(selectedSubcategories).flatMap(([categoryId, subs]) => 
          subs.map(subId => ({ categoryId, subId }))
        )
      }),
      applySaved: () => {},
    }),
    [isDirty, label, selectedSpecialties, selectedSubcategories],
  );

  React.useEffect(() => {
    onStatusChange?.({ isDirty, isSaving: false, canSave: true, label });
  }, [isDirty, label, onStatusChange]);

  const handleSpecialtyToggle = (categoryId: string) => {
    setSelectedSpecialties((prev) => {
      const isAdding = !prev.includes(categoryId);
      
      if (isAdding) {
        // Check if adding would exceed the limit of 3 main categories
        if (prev.length >= 3) {
          setToastMessage(locale === "ar" 
            ? "لا يمكن اختيار أكثر من 3 تخصصات رئيسية" 
            : "Cannot select more than 3 main categories"
          );
          setTimeout(() => setToastMessage(null), 3000);
          return prev;
        }
        const newSpecialties = [...prev, categoryId];
        setIsDirty(true);
        return newSpecialties;
      } else {
        const newSpecialties = prev.filter((s) => s !== categoryId);
        // Also remove subcategories for this main category
        setSelectedSubcategories((prevSubs) => {
          const updated = { ...prevSubs };
          delete updated[categoryId];
          return updated;
        });
        setIsDirty(true);
        return newSpecialties;
      }
    });
  };

  const handleCategoryClick = (category: DisplayCategory) => {
    // Exception: Delivery services (ID: 46) should not open subcategory dialog
    if (category.id === 46) {
      handleSpecialtyToggle(category.id.toString());
      return;
    }
    
    setSelectedCategoryForDialog(category);
    setIsDialogOpen(true);
    fetchSubcategories(category.id);
  };

  const fetchSubcategories = async (categoryId: number) => {
    setIsLoadingSubcategories(true);
    try {
      // Check if this is a collection category
      const category = displayCategories.find(cat => cat.id === categoryId);
      
      if (category?.isCollection) {
        // Fetch individual categories that belong to this collection
        const data = await govaApi.getPublicJson<Category[]>(
          "/catagory/categories.json",
        );
        const collectionItems = data.filter((cat) => cat.collection === categoryId);
        
        // Convert collection items to subcategory-like structure
        const subcategoryLikeItems: Subcategory[] = collectionItems.map(cat => ({
          id: cat.id,
          category_id: categoryId,
          original_id: cat.id,
          title_ar: cat.title_ar,
          title_en: cat.title_en,
          icon: cat.icon,
          image: cat.image,
          created_at: cat.created_at,
          updated_at: cat.updated_at,
        }));
        
        setSubcategories(subcategoryLikeItems);
      } else {
        // Fetch regular subcategories from subcategories.json
        const data = await govaApi.getPublicJson<Subcategory[]>(
          "/catagory/subcategories.json",
        );
        const filtered = data.filter((sub) => sub.category_id === categoryId);
        setSubcategories(filtered);
      }
    } catch (error) {
      console.error("Failed to fetch subcategories:", error);
    } finally {
      setIsLoadingSubcategories(false);
    }
  };

  const handleSubcategoryToggle = (subcategoryId: string) => {
    if (!selectedCategoryForDialog) return;
    
    const categoryId = selectedCategoryForDialog.id.toString();
    setSelectedSubcategories((prev) => {
      const currentSubs = prev[categoryId] || [];
      const isAdding = !currentSubs.includes(subcategoryId);
      const newSubs = isAdding
        ? [...currentSubs, subcategoryId]
        : currentSubs.filter((s) => s !== subcategoryId);
      
      // Auto-select/deselect main category based on subcategory selection
      setSelectedSpecialties((prevMain) => {
        if (isAdding) {
          // Adding subcategory: ensure main category is selected
          // Check if this would exceed the limit of 3 main categories
          if (!prevMain.includes(categoryId) && prevMain.length >= 3) {
            setToastMessage(locale === "ar" 
              ? "لا يمكن اختيار أكثر من 3 تخصصات رئيسية" 
              : "Cannot select more than 3 main categories"
            );
            setTimeout(() => setToastMessage(null), 3000);
            return prevMain;
          }
          if (!prevMain.includes(categoryId)) {
            return [...prevMain, categoryId];
          }
          return prevMain;
        } else {
          // Removing subcategory: deselect main if no more subcategories
          if (newSubs.length === 0 && prevMain.includes(categoryId)) {
            return prevMain.filter((id) => id !== categoryId);
          }
          return prevMain;
        }
      });
      
      setIsDirty(true);
      return {
        ...prev,
        [categoryId]: newSubs,
      };
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
    <>
      <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-on-surface mb-2">
          {t("onboarding.storeIdentity.specialties")}
        </h3>
        <p className="text-xs text-on-surface-variant mb-4">
          {t("onboarding.storeIdentity.specialtiesHint")}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:gap-3 sm:grid-cols-6">
        {displayCategories.map((category) => {
          const categoryId = category.id.toString();
          const categoryName =
            locale === "ar" ? category.name_ar : category.name_en;
          const imgSrc = `/images/mainCategories/${category.image}`;

          return (
            <div
              key={category.id}
              className="relative flex flex-col gap-1 group transition-transform duration-200 active:scale-95 cursor-pointer"
              onClick={() => handleCategoryClick(category)}
            >
              <div className="relative aspect-[4/3.5] rounded-lg overflow-hidden border-2 border-transparent transition-all">
                <div className="relative w-full h-full rounded-lg overflow-hidden bg-surface-bright group-hover:opacity-90 transition-opacity">
                  <Image
                    src={imgSrc}
                    alt={categoryName}
                    fill
                    className="object-cover"
                  />
                  {selectedSpecialties.includes(categoryId) && (
                    <div className="absolute inset-0 bg-primary/20" />
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSpecialtyToggle(categoryId);
                  }}
                >
                  <Checkbox
                    id={categoryId}
                    checked={selectedSpecialties.includes(categoryId)}
                    onCheckedChange={() => handleSpecialtyToggle(categoryId)}
                    disabled={readOnly}
                    className="h-4 w-4"
                  />
                </div>
                <Label
                  htmlFor={categoryId}
                  className="text-[10px] font-normal leading-3 truncate cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {categoryName}
                </Label>
              </div>
            </div>
          );
        })}
      </div>

      {(selectedSpecialties.length > 0 || Object.values(selectedSubcategories).some(arr => arr.length > 0)) && (
        <p className="text-xs text-muted-foreground">
          {t("profile.selected")}: {(() => {
            const subObj = Object.fromEntries(
              Object.entries(selectedSubcategories).filter(([_, subs]) => subs.length > 0)
            );
            const subStr = Object.entries(subObj)
              .map(([catId, subs]) => `${catId}: [${subs.join(", ")}]`)
              .join(", ");
            return `{main: [${selectedSpecialties.join(", ")}], sub: {${subStr}}}`;
          })()}
        </p>
      )}
      </div>

      {/* Subcategories Dialog */}
      {isDialogOpen && selectedCategoryForDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-outline-variant">
              <h2 className="text-lg font-semibold text-on-surface">
                {locale === "ar"
                  ? selectedCategoryForDialog?.name_ar
                  : selectedCategoryForDialog?.name_en}
              </h2>
              <button
                type="button"
                onClick={() => setIsDialogOpen(false)}
                className="p-2 rounded-full hover:bg-surface-container transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5 text-on-surface-variant" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {isLoadingSubcategories ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="lg" />
                </div>
              ) : subcategories.length === 0 ? (
                <p className="text-center text-on-surface-variant py-8">
                  {locale === "ar" ? "لا توجد تخصصات فرعية" : "No subcategories"}
                </p>
              ) : (
                <div className="grid grid-cols-4 gap-2 sm:gap-3 sm:grid-cols-6">
                  {subcategories.map((subcategory) => {
                    const subcategoryId = subcategory.original_id.toString();
                    const subcategoryName =
                      locale === "ar"
                        ? subcategory.title_ar
                        : subcategory.title_en;
                    // Use correct image path based on whether it's a collection item or regular subcategory
                    const imgSrc = selectedCategoryForDialog?.isCollection
                      ? `/images/mainCategories/${subcategory.image}`
                      : `/images/subCategories/${subcategory.image}`;
                    const currentCategorySubs = selectedSubcategories[selectedCategoryForDialog?.id.toString()] || [];
                    const isChecked = currentCategorySubs.includes(subcategoryId);

                    return (
                      <div
                        key={subcategory.id}
                        className="relative flex flex-col gap-1 group"
                      >
                        <div className="relative aspect-[4/3.5] rounded-lg overflow-hidden border-2 border-transparent transition-all">
                          <div className="relative w-full h-full rounded-lg overflow-hidden bg-surface-bright group-hover:opacity-90 transition-opacity">
                            <Image
                              src={imgSrc}
                              alt={subcategoryName}
                              fill
                              className="object-cover"
                            />
                            {isChecked && (
                              <div className="absolute inset-0 bg-primary/20" />
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Checkbox
                            id={`sub-${subcategoryId}`}
                            checked={isChecked}
                            onCheckedChange={() =>
                              handleSubcategoryToggle(subcategoryId)
                            }
                            disabled={readOnly}
                            className="h-4 w-4"
                          />
                          <Label
                            htmlFor={`sub-${subcategoryId}`}
                            className="text-[10px] font-normal leading-3 truncate cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {subcategoryName}
                          </Label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-outline-variant flex justify-between items-center">
              <p className="text-sm text-on-surface-variant">
                {selectedCategoryForDialog && selectedSubcategories[selectedCategoryForDialog.id.toString()]?.length > 0
                  ? `${t("profile.selected")}: [${selectedSubcategories[selectedCategoryForDialog.id.toString()].join(", ")}]`
                  : ""}
              </p>
              <button
                type="button"
                onClick={() => setIsDialogOpen(false)}
                className="px-4 py-2 bg-primary text-on-primary rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                {locale === "ar" ? "تم" : "Done"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-3 rounded-lg shadow-lg z-[100] animate-in fade-in slide-in-from-bottom-4 duration-300">
          <p className="text-sm font-medium">{toastMessage}</p>
        </div>
      )}
    </>
  );
});

export default SpecialtiesCard;
