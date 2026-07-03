"use client";

import * as React from "react";
import Image from "next/image";
import { ChevronDown, ChevronRight, ChevronLeft, Package } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { categoryService, type CategoryDisplay, type SubcategoryDisplay } from "@/features/categories";
import type { ProfileSpecialtiesSelection } from "@/features/profile/entities/profile-specialties.entity";
import type {
  ProfileSectionStatus,
  ProfileSpecialtiesController,
} from "./profile-save-controller";

interface ProductsCardProps {
  uid: string;
  showSaveButton?: boolean;
  onStatusChange?: (status: ProfileSectionStatus) => void;
  readOnly?: boolean;
}

export const ProductsCard = React.forwardRef<
  ProfileSpecialtiesController,
  ProductsCardProps
>(function ProductsCard({ uid, onStatusChange, readOnly = false }, ref) {
  const { t, locale } = useTranslation();
  const [displayCategories, setDisplayCategories] = React.useState<
    CategoryDisplay[]
  >([]);
  const [selectedSpecialties, setSelectedSpecialties] = React.useState<
    string[]
  >([]);
  const [selectedSubcategories, setSelectedSubcategories] = React.useState<
    Record<string, string[]>
  >({});
  const [isLoading, setIsLoading] = React.useState(true);
  const [expandedCategories, setExpandedCategories] = React.useState<Set<string>>(new Set());
  const [expandedSubcategories, setExpandedSubcategories] = React.useState<Set<string>>(new Set());
  const label = t("onboarding.storeIdentity.products");

  const applySelection = React.useCallback(
    (selection: ProfileSpecialtiesSelection) => {
      setSelectedSpecialties(selection.main.map(String));
      setSelectedSubcategories(
        Object.fromEntries(
          Object.entries(selection.sub).map(([key, ids]) => [
            key,
            ids.map(String),
          ]),
        ),
      );
      // Auto-expand all categories and subcategories on load
      setExpandedCategories(new Set(selection.main.map(String)));
      const allSubIds = Object.values(selection.sub).flat().map(String);
      setExpandedSubcategories(new Set(allSubIds));
    },
    [],
  );

  React.useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    // Import profileService dynamically to avoid circular dependency
    import("@/features/profile/services/profile-service").then(({ profileService }) => {
      profileService
        .getSpecialties(uid)
        .then((selection) => {
          if (!cancelled) applySelection(selection);
        })
        .catch((error) => console.error("Failed to load specialties:", error));
    });
    return () => {
      cancelled = true;
    };
  }, [applySelection, uid]);

  React.useEffect(() => {
    const fetchCategories = async () => {
      try {
        const displayCats = categoryService.getProfileMainOptions();
        setDisplayCategories([...displayCats]);
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
      isDirty: false,
      isSaving: false,
      canSave: true,
      label,
      save: async () => true,
      getSnapshot: () => ({
        main: selectedSpecialties.map(Number),
        sub: Object.fromEntries(
          Object.entries(selectedSubcategories)
            .filter(([, ids]) => ids.length > 0)
            .map(([categoryId, ids]) => [categoryId, ids.map(Number)]),
        ),
      }),
      applySaved: applySelection,
    }),
    [
      applySelection,
      label,
      selectedSpecialties,
      selectedSubcategories,
    ],
  );

  React.useEffect(() => {
    onStatusChange?.({ isDirty: false, isSaving: false, canSave: true, label });
  }, [label, onStatusChange]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const toggleSubcategory = (subcategoryId: string) => {
    setExpandedSubcategories((prev) => {
      const next = new Set(prev);
      if (next.has(subcategoryId)) {
        next.delete(subcategoryId);
      } else {
        next.add(subcategoryId);
      }
      return next;
    });
  };

  const getCategoryName = (categoryId: string) => {
    const category = displayCategories.find(cat => cat.id.toString() === categoryId);
    return category ? (locale === 'ar' ? category.nameAr : category.nameEn) : categoryId;
  };

  const getSubcategoryName = (categoryId: string, subcategoryId: string) => {
    const category = displayCategories.find(cat => cat.id.toString() === categoryId);
    if (!category) return subcategoryId;
    
    const subcategories = categoryService.getProfileSubOptions(category.id, category.isCollection);
    
    const subcategory = subcategories.find(sub => 
      sub.originalId?.toString() === subcategoryId || 
      sub.id.toString() === subcategoryId ||
      (sub.kind === 'collection-member' && sub.id.toString() === subcategoryId)
    );
    
    if (subcategory) {
      return locale === 'ar' ? subcategory.nameAr : subcategory.nameEn;
    }
    
    if (!category.isCollection) {
      const tree = categoryService.getCategoryTree(category.id);
      if (tree) {
        const treeSub = tree.subcategories.find(sub => 
          sub.originalId?.toString() === subcategoryId || 
          sub.id.toString() === subcategoryId
        );
        if (treeSub) {
          return locale === 'ar' ? treeSub.nameAr : treeSub.nameEn;
        }
        
        if (category.id === 20) { // MEDICAL_SERVICES_CATEGORY_ID
          const doctorSub = tree.doctorAppointmentItems.find(sub => 
            sub.originalId?.toString() === subcategoryId || 
            sub.id.toString() === subcategoryId
          );
          if (doctorSub) {
            return locale === 'ar' ? doctorSub.nameAr : doctorSub.nameEn;
          }
        }
      }
    }
    
    if (category.id === 20) {
      const doctorItems = categoryService.getDoctorAppointmentItems();
      const doctorSub = doctorItems.find(sub => 
        sub.originalId?.toString() === subcategoryId || 
        sub.id.toString() === subcategoryId
      );
      if (doctorSub) {
        return locale === 'ar' ? doctorSub.nameAr : doctorSub.nameEn;
      }
    }
    
    return subcategoryId;
  };

  const getCategoryImage = (categoryId: string) => {
    const category = displayCategories.find(cat => cat.id.toString() === categoryId);
    return category?.imageUrl || "";
  };

  const getSubcategoryImage = (categoryId: string, subcategoryId: string) => {
    const category = displayCategories.find(cat => cat.id.toString() === categoryId);
    if (!category) return "";
    
    const subcategories = categoryService.getProfileSubOptions(category.id, category.isCollection);
    const subcategory = subcategories.find(sub => 
      sub.originalId?.toString() === subcategoryId || 
      sub.id.toString() === subcategoryId ||
      (sub.kind === 'collection-member' && sub.id.toString() === subcategoryId)
    );
    
    if (subcategory) return subcategory.imageUrl;
    
    if (!category.isCollection) {
      const tree = categoryService.getCategoryTree(category.id);
      if (tree) {
        const treeSub = tree.subcategories.find(sub => 
          sub.originalId?.toString() === subcategoryId || 
          sub.id.toString() === subcategoryId
        );
        if (treeSub) return treeSub.imageUrl;
        
        if (category.id === 20) {
          const doctorSub = tree.doctorAppointmentItems.find(sub => 
            sub.originalId?.toString() === subcategoryId || 
            sub.id.toString() === subcategoryId
          );
          if (doctorSub) return doctorSub.imageUrl;
        }
      }
    }
    
    if (category.id === 20) {
      const doctorItems = categoryService.getDoctorAppointmentItems();
      const doctorSub = doctorItems.find(sub => 
        sub.originalId?.toString() === subcategoryId || 
        sub.id.toString() === subcategoryId
      );
      if (doctorSub) return doctorSub.imageUrl;
    }
    
    return "";
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const hasSelections = selectedSpecialties.length > 0 || 
    Object.values(selectedSubcategories).some(arr => arr.length > 0);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-on-surface mb-2 flex items-center gap-2">
          <Package className="h-4 w-4" />
          {t("onboarding.storeIdentity.products")}
        </h3>
        <p className="text-xs text-on-surface-variant mb-4">
          {t("onboarding.storeIdentity.productsHint")}
        </p>
      </div>

      {!hasSelections ? (
        <div className="text-center py-8 border border-dashed border-outline-variant rounded-lg">
          <Package className="h-8 w-8 mx-auto text-on-surface-variant mb-2" />
          <p className="text-sm text-on-surface-variant">
            {locale === 'ar' ? 'لم يتم اختيار أي تخصصات بعد' : 'No specialties selected yet'}
          </p>
          <p className="text-xs text-on-surface-variant mt-1">
            {locale === 'ar' ? 'اختر التخصصات من تبويب "التخصصات"' : 'Select specialties from the "Specialties" tab'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {selectedSpecialties.map((categoryId) => {
            const categoryName = getCategoryName(categoryId);
            const categoryImage = getCategoryImage(categoryId);
            const subIds = selectedSubcategories[categoryId] || [];
            const isExpanded = expandedCategories.has(categoryId);

            return (
              <div key={categoryId} className="border border-outline-variant rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleCategory(categoryId)}
                  className="w-full flex items-center gap-3 p-3 bg-surface-container-low hover:bg-surface-container transition-colors"
                >
                  <div className="relative h-10 w-10 rounded-lg overflow-hidden bg-surface-bright flex-shrink-0">
                    {categoryImage && (
                      <Image
                        src={categoryImage}
                        alt={categoryName}
                        fill
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 text-start">
                    <span className="text-sm font-medium text-on-surface">{categoryName}</span>
                    {subIds.length > 0 && (
                      <span className="text-xs text-on-surface-variant block mt-0.5">
                        {locale === 'ar' ? `${subIds.length} تصنيف فرعي` : `${subIds.length} subcategories`}
                      </span>
                    )}
                  </div>
                  {locale === 'ar' ? (
                    isExpanded ? <ChevronDown className="h-4 w-4 text-on-surface-variant" /> : <ChevronLeft className="h-4 w-4 text-on-surface-variant" />
                  ) : (
                    isExpanded ? <ChevronDown className="h-4 w-4 text-on-surface-variant" /> : <ChevronRight className="h-4 w-4 text-on-surface-variant" />
                  )}
                </button>

                {isExpanded && subIds.length > 0 && (
                  <div className="border-t border-outline-variant/50 p-2 space-y-2 bg-surface">
                    {subIds.map((subId) => {
                      const subName = getSubcategoryName(categoryId, subId);
                      const subImage = getSubcategoryImage(categoryId, subId);
                      const isSubExpanded = expandedSubcategories.has(subId);

                      return (
                        <div key={subId} className="border border-outline-variant/50 rounded-md overflow-hidden">
                          <button
                            type="button"
                            onClick={() => toggleSubcategory(subId)}
                            className="w-full flex items-center gap-2 p-2 bg-surface-container-high/50 hover:bg-surface-container-high transition-colors"
                          >
                            <div className="relative h-8 w-8 rounded-md overflow-hidden bg-surface-bright flex-shrink-0">
                              {subImage && (
                                <Image
                                  src={subImage}
                                  alt={subName}
                                  fill
                                  className="object-cover"
                                />
                              )}
                            </div>
                            <span className="text-xs font-medium text-on-surface flex-1 text-start">{subName}</span>
                            {locale === 'ar' ? (
                              isSubExpanded ? <ChevronDown className="h-3 w-3 text-on-surface-variant" /> : <ChevronLeft className="h-3 w-3 text-on-surface-variant" />
                            ) : (
                              isSubExpanded ? <ChevronDown className="h-3 w-3 text-on-surface-variant" /> : <ChevronRight className="h-3 w-3 text-on-surface-variant" />
                            )}
                          </button>

                          {isSubExpanded && (
                            <div className="border-t border-outline-variant/30 p-3 bg-surface-container-low/30">
                              <div className="text-center py-4">
                                <Package className="h-6 w-6 mx-auto text-on-surface-variant mb-2" />
                                <p className="text-xs text-on-surface-variant">
                                  {locale === 'ar' ? 'لا توجد منتجات مضافة بعد' : 'No products added yet'}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

export default ProductsCard;
