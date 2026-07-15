"use client";

import * as React from "react";
import Image from "next/image";
import { X, AlertTriangle } from "lucide-react";
import { BOTTOM_NAV_CLEARANCE } from "@/components/layouts/bottom-nav-layout";
import { useTranslation } from "@/lib/i18n";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { asolApi } from "@/core/api";
import { profileService } from "@/features/profile/services/profile-service";
import { categoryService, CATEGORY_CONSTANTS, type CategoryDisplay, type SubcategoryDisplay } from "@/features/categories";
import type { ProfileSpecialtiesSelection } from "@/features/profile/entities/profile-specialties.entity";
import type {
  ProfileSectionStatus,
  ProfileSpecialtiesController,
} from "./profile-save-controller";

const MEDICAL_SERVICES_CATEGORY_ID = CATEGORY_CONSTANTS.MEDICAL_SERVICES_ID;
const DELIVERY_SERVICES_ID = CATEGORY_CONSTANTS.DELIVERY_SERVICES_ID;

/**
 * EXCEPTIONAL CATEGORIES:
 *
 * 1. Beauty Store (Collection Type):
 *    - This is a collection category that contains individual categories as sub-items
 *    - When selected, it shows its collection items (e.g., "May Way", "Oriflame", "Avon") as subcategories
 *    - Collection items are supplied by the category module as typed projections.
 *    - Images for collection items use /images/mainCategories/ path
 *
 * 2. Delivery Services (ID: 46):
 *    - This is an exceptional category that should NOT open a subcategory dialog
 *    - When clicked, it behaves like a normal main category (toggle selection only)
 *    - It can be selected and saved in profile.selected without any subcategories
 *    - Handled in handleCategoryClick with an explicit check for category.id === 46
 */

interface SpecialtiesCardProps {
  uid: string;
  showSaveButton?: boolean;
  onStatusChange?: (status: ProfileSectionStatus) => void;
  readOnly?: boolean;
  /** When true, the 3 main-categories limit is removed (super-admin only). */
  unlimited?: boolean;
}

export const SpecialtiesCard = React.forwardRef<
  ProfileSpecialtiesController,
  SpecialtiesCardProps
>(function SpecialtiesCard({ uid, onStatusChange, readOnly = false, unlimited = false }, ref) {
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
  const [isDirty, setIsDirty] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [selectedCategoryForDialog, setSelectedCategoryForDialog] =
    React.useState<CategoryDisplay | null>(null);
  const [subcategories, setSubcategories] = React.useState<SubcategoryDisplay[]>([]);
  const [doctorAppointmentSubcategories, setDoctorAppointmentSubcategories] =
    React.useState<SubcategoryDisplay[]>([]);
  const [isDoctorAppointmentView, setIsDoctorAppointmentView] =
    React.useState(false);
  const [isLoadingSubcategories, setIsLoadingSubcategories] =
    React.useState(false);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = React.useState<{ type: 'main' | 'sub', categoryId: string, subcategoryId?: string } | null>(null);
  const label = t("onboarding.storeIdentity.specialties");

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
      setIsDirty(false);
    },
    [],
  );

  React.useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    profileService
      .getSpecialties(uid)
      .then((selection) => {
        if (!cancelled) applySelection(selection);
      })
      .catch((error) => console.error("Failed to load specialties:", error));
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
      isDirty,
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
      isDirty,
      label,
      selectedSpecialties,
      selectedSubcategories,
    ],
  );

  React.useEffect(() => {
    onStatusChange?.({ isDirty, isSaving: false, canSave: true, label });
  }, [isDirty, label, onStatusChange]);

  const handleSpecialtyToggle = (categoryId: string) => {
    setSelectedSpecialties((prev) => {
      const isAdding = !prev.includes(categoryId);

      if (isAdding) {
        // Check if adding would exceed the limit of 3 main categories (skipped for unlimited/super-admin)
        if (!unlimited && prev.length >= 3) {
          setToastMessage(
            locale === "ar"
              ? "لا يمكن اختيار أكثر من 3 تخصصات رئيسية"
              : "Cannot select more than 3 main categories",
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

  const handleCategoryClick = (category: CategoryDisplay) => {
    // Exception: Delivery services (ID: 46) should not open subcategory dialog
    if (category.id === 46) {
      handleSpecialtyToggle(category.id.toString());
      return;
    }

    setSelectedCategoryForDialog(category);
    setIsDialogOpen(true);
    setIsDoctorAppointmentView(false);
    setDoctorAppointmentSubcategories([]);
    fetchSubcategories(category.id);
  };

  const fetchSubcategories = async (categoryId: number) => {
    setIsLoadingSubcategories(true);
    try {
      // Check if this is a collection category
      const category = displayCategories.find((cat) => cat.id === categoryId);

      if (category?.isCollection) {
        // Use categoryService to get collection items
        const items = categoryService.getProfileSubOptions(categoryId, true);
        setSubcategories([...items]);
      } else {
        // Use categoryService to get regular subcategories
        const items = categoryService.getProfileSubOptions(categoryId, false);
        
        if (categoryId === MEDICAL_SERVICES_CATEGORY_ID) {
          // Get actual doctor appointment items using the new service method
          const doctorItems = categoryService.getDoctorAppointmentItems();

          // Keep doctor group in visible items so it can be clicked
          setDoctorAppointmentSubcategories([...doctorItems]);
          setSubcategories([...items]);
        } else {
          setDoctorAppointmentSubcategories([]);
          setSubcategories([...items]);
        }
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
          // Check if this would exceed the limit of 3 main categories (skipped for unlimited/super-admin)
          if (!unlimited && !prevMain.includes(categoryId) && prevMain.length >= 3) {
            setToastMessage(
              locale === "ar"
                ? "لا يمكن اختيار أكثر من 3 تخصصات رئيسية"
                : "Cannot select more than 3 main categories",
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

  const visibleSubcategories = isDoctorAppointmentView
    ? doctorAppointmentSubcategories
    : subcategories;

  const getCategoryName = (categoryId: string) => {
    const category = displayCategories.find(cat => cat.id.toString() === categoryId);
    return category ? (locale === 'ar' ? category.nameAr : category.nameEn) : categoryId;
  };

  const getSubcategoryName = (categoryId: string, subcategoryId: string) => {
    const category = displayCategories.find(cat => cat.id.toString() === categoryId);
    if (!category) return subcategoryId;
    
    const subcategories = categoryService.getProfileSubOptions(category.id, category.isCollection);
    
    // Try to find by originalId first, then by id, then by value (for collections)
    const subcategory = subcategories.find(sub => 
      sub.originalId?.toString() === subcategoryId || 
      sub.id.toString() === subcategoryId ||
      (sub.kind === 'collection-member' && sub.id.toString() === subcategoryId)
    );
    
    if (subcategory) {
      return locale === 'ar' ? subcategory.nameAr : subcategory.nameEn;
    }
    
    // If not found, try to get from category tree for regular categories
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
        
        // Also check doctor appointment items (for Medical Services category)
        if (category.id === MEDICAL_SERVICES_CATEGORY_ID) {
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
    
    // Final fallback: try the service's getDoctorAppointmentItems directly
    if (category.id === MEDICAL_SERVICES_CATEGORY_ID) {
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

  const handleDelete = () => {
    if (!deleteDialog) return;

    if (deleteDialog.type === 'main') {
      handleSpecialtyToggle(deleteDialog.categoryId);
    } else if (deleteDialog.type === 'sub' && deleteDialog.subcategoryId) {
      handleSubcategoryToggle(deleteDialog.subcategoryId);
    }
    setDeleteDialog(null);
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
              locale === "ar" ? category.nameAr : category.nameEn;
            const imgSrc = category.imageUrl;

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
                <div
                  className="flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    onClick={(e) => e.stopPropagation()}
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

        {(selectedSpecialties.length > 0 ||
          Object.values(selectedSubcategories).some(
            (arr) => arr.length > 0,
          )) && (
          <div className="flex flex-wrap gap-1.5 pt-2">
            {selectedSpecialties.map((categoryId) => {
              const categoryName = getCategoryName(categoryId);
              const subIds = selectedSubcategories[categoryId] || [];
              
              return (
                <div key={categoryId} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-surface-container-high border border-outline-variant/50">
                  <span className="text-[11px] font-medium text-on-surface">{categoryName}</span>
                  <button
                    type="button"
                    onClick={() => setDeleteDialog({ type: 'main', categoryId })}
                    className="p-0.5 rounded hover:bg-error/10 hover:text-error transition-colors"
                    aria-label={locale === 'ar' ? 'حذف' : 'Delete'}
                  >
                    <X className="h-3 w-3" />
                  </button>
                  {subIds.length > 0 && (
                    <div className="flex flex-wrap gap-0.5 pl-1 border-l border-outline-variant/50">
                      {subIds.map((subId) => (
                        <div key={subId} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-surface-container border border-outline-variant/30">
                          <span className="text-[10px] text-on-surface-variant">{getSubcategoryName(categoryId, subId)}</span>
                          <button
                            type="button"
                            onClick={() => setDeleteDialog({ type: 'sub', categoryId, subcategoryId: subId })}
                            className="p-0.5 rounded hover:bg-error/10 hover:text-error transition-colors"
                            aria-label={locale === 'ar' ? 'حذف' : 'Delete'}
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Subcategories Dialog */}
      {isDialogOpen && selectedCategoryForDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-outline-variant">
              <div className="flex items-center gap-3">
                {isDoctorAppointmentView && (
                  <button
                    type="button"
                    onClick={() => setIsDoctorAppointmentView(false)}
                    className="px-3 py-1.5 rounded-lg text-sm bg-surface-container hover:bg-surface-container-high transition-colors"
                  >
                    {locale === "ar" ? "\u0631\u062c\u0648\u0639" : "Back"}
                  </button>
                )}
                <h2 className="text-lg font-semibold text-on-surface">
                  {isDoctorAppointmentView
                    ? locale === "ar"
                      ? "\u0643\u0634\u0641 \u0637\u0628\u064a"
                      : "Doctor Appointment"
                    : locale === "ar"
                      ? selectedCategoryForDialog?.nameAr
                      : selectedCategoryForDialog?.nameEn}
                </h2>
              </div>
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
              ) : visibleSubcategories.length === 0 && doctorAppointmentSubcategories.length === 0 ? (
                <p className="text-center text-on-surface-variant py-8">
                  {locale === "ar"
                    ? "لا توجد تخصصات فرعية"
                    : "No subcategories"}
                </p>
              ) : (
                <div className="grid grid-cols-4 gap-2 sm:gap-3 sm:grid-cols-6">
                  {visibleSubcategories.map((subcategory) => {
                    const subcategoryId = subcategory.originalId?.toString() || subcategory.id.toString();
                    const subcategoryName =
                      locale === "ar"
                        ? subcategory.nameAr
                        : subcategory.nameEn;
                    // Use correct image path based on whether it's a collection item or regular subcategory
                    const imgSrc = subcategory.imageUrl;
                    const currentCategorySubs =
                      selectedSubcategories[
                        selectedCategoryForDialog?.id.toString()
                      ] || [];
                    const isGroup = subcategory.isDoctorAppointmentGroup;
                    const isChecked = isGroup
                      ? doctorAppointmentSubcategories.some((doctorSub) =>
                          currentCategorySubs.includes(
                            doctorSub.originalId?.toString() || doctorSub.id.toString(),
                          ),
                        )
                      : currentCategorySubs.includes(subcategoryId);

                    return (
                      <div
                        key={subcategory.id}
                        className={`relative flex flex-col gap-1 group ${
                          isGroup
                            ? "cursor-pointer transition-transform duration-200 active:scale-95"
                            : ""
                        }`}
                        onClick={() => {
                          if (isGroup) setIsDoctorAppointmentView(true);
                        }}
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
                          {!isGroup && (
                            <Checkbox
                              id={`sub-${subcategoryId}`}
                              checked={isChecked}
                              onCheckedChange={() =>
                                handleSubcategoryToggle(subcategoryId)
                              }
                              disabled={readOnly}
                              className="h-4 w-4"
                            />
                          )}
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
            <div className="p-4 border-t border-outline-variant flex flex-col gap-3">
              {selectedCategoryForDialog &&
              selectedSubcategories[selectedCategoryForDialog.id.toString()]?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedSubcategories[selectedCategoryForDialog.id.toString()].map((subId) => (
                    <div key={subId} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-surface-container-high border border-outline-variant/50">
                      <span className="text-[11px] font-medium text-on-surface">
                        {getSubcategoryName(selectedCategoryForDialog.id.toString(), subId)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setDeleteDialog({ type: 'sub', categoryId: selectedCategoryForDialog.id.toString(), subcategoryId: subId })}
                        className="p-0.5 rounded hover:bg-error/10 hover:text-error transition-colors"
                        aria-label={locale === 'ar' ? 'حذف' : 'Delete'}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-end">
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
        </div>
      )}
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className="fixed right-4 z-[100] animate-in fade-in slide-in-from-bottom-4 rounded-lg bg-red-600 px-4 py-3 text-white shadow-lg duration-300"
          style={{ bottom: BOTTOM_NAV_CLEARANCE }}
        >
          <p className="text-sm font-medium">{toastMessage}</p>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface rounded-xl shadow-xl max-w-sm w-full p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-error/10 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-error" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-on-surface">
                  {locale === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete'}
                </h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  {deleteDialog.type === 'main'
                    ? (locale === 'ar' 
                        ? `هل أنت متأكد من حذف "${getCategoryName(deleteDialog.categoryId)}"؟ سيتم حذف جميع التخصصات الفرعية التابعة له.`
                        : `Are you sure you want to delete "${getCategoryName(deleteDialog.categoryId)}"? All its subcategories will also be removed.`)
                    : (locale === 'ar'
                        ? `هل أنت متأكد من حذف "${getSubcategoryName(deleteDialog.categoryId, deleteDialog.subcategoryId!)}"؟`
                        : `Are you sure you want to delete "${getSubcategoryName(deleteDialog.categoryId, deleteDialog.subcategoryId!)}"?`)
                  }
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeleteDialog(null)}
                className="text-xs"
              >
                {locale === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleDelete}
                className="text-xs bg-error text-on-error hover:bg-error/90"
              >
                {locale === 'ar' ? 'حذف' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

export default SpecialtiesCard;
