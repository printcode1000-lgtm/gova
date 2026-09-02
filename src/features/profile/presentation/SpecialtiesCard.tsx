"use client";

import * as React from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { useTranslation } from "@/shared/i18n";
import { Checkbox } from "@/shared/ui/checkbox";
import { Label } from "@/shared/ui/label";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { Button } from "@/shared/ui/button";
import { asolApi } from "@/core/api";
import { profileService } from "@/features/profile/application/services/profile-service";
import { reportSystemIssue } from "@asol/system-logs-core";
import { productApiService } from "@/features/product/ui";
import {
  categoryService,
  type CategoryDisplay,
  type SubcategoryDisplay,
} from "@/features/categories";
import type { ProfileSpecialtiesSelection } from "@/features/profile/domain/profile-specialties.entity";
import type {
  ProfileSectionStatus,
  ProfileSpecialtiesController,
} from "./profile-save-controller";
import {
  categoryRequiresSubcategorySelection,
  MEDICAL_SERVICES_CATEGORY_ID,
  normalizeLoadedSpecialties,
  selectableSubcategoryIdsForCategory,
} from "./specialties-selection";
import {
  specialtyDeleteImpactPairs,
  type SpecialtyRemoval,
} from "./specialties-delete-impact";
import { SpecialtiesToast } from "./SpecialtiesToast";

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
>(function SpecialtiesCard(
  { uid, onStatusChange, readOnly = false, unlimited = false },
  ref,
) {
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
  const [subcategories, setSubcategories] = React.useState<
    SubcategoryDisplay[]
  >([]);
  const [doctorAppointmentSubcategories, setDoctorAppointmentSubcategories] =
    React.useState<SubcategoryDisplay[]>([]);
  const [isDoctorAppointmentView, setIsDoctorAppointmentView] =
    React.useState(false);
  const [isLoadingSubcategories, setIsLoadingSubcategories] =
    React.useState(false);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const [removals, setRemovals] = React.useState<SpecialtyRemoval[]>([]);
  const [impactedProductCount, setImpactedProductCount] = React.useState(0);
  const label = t("onboarding.storeIdentity.specialties");

  const [loadFailed, setLoadFailed] = React.useState(false);

  const applySelection = React.useCallback(
    (selection: ProfileSpecialtiesSelection) => {
      const normalized = normalizeLoadedSpecialties(selection);
      setSelectedSpecialties(normalized.main.map(String));
      setSelectedSubcategories(
        Object.fromEntries(
          Object.entries(normalized.sub).map(([key, ids]) => [
            key,
            ids.map(String),
          ]),
        ),
      );
      setIsDirty(false);
      setRemovals([]);
    },
    [],
  );

  /**
   * The saved selection, and what happens when it cannot be read.
   *
   * A failed load used to leave the editor showing an empty selection with no
   * sign anything was wrong, which is the one state this card must never be
   * saved from: the user would be writing "no specialties" over the ones they
   * have. The failure is now visible, the editor stays closed behind it, and
   * the load retries itself when the browser reports a network again.
   */
  const loadSpecialties = React.useCallback(async () => {
    if (!uid) return;
    try {
      applySelection(await profileService.getSpecialties(uid));
      setLoadFailed(false);
    } catch (error) {
      setLoadFailed(true);
      reportSystemIssue({
        feature: "Profile",
        operation: "load-specialties",
        error,
      });
    }
  }, [applySelection, uid]);

  React.useEffect(() => {
    void loadSpecialties();
  }, [loadSpecialties]);

  React.useEffect(() => {
    if (!loadFailed || typeof window === "undefined") return;
    const handleOnline = () => void loadSpecialties();
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [loadFailed, loadSpecialties]);

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
      canSave: !loadFailed,
      label,
      save: async () => true,
      getSnapshot: () =>
        normalizeLoadedSpecialties({
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
      loadFailed,
      selectedSpecialties,
      selectedSubcategories,
    ],
  );



  React.useEffect(() => {
    if (removals.length === 0 || !uid) {
      setImpactedProductCount(0);
      return;
    }

    let cancelled = false;
    const pairs = removals.flatMap((removal) =>
      specialtyDeleteImpactPairs({ removal, selectedSubcategories }),
    );

    if (pairs.length === 0) {
      setImpactedProductCount(0);
      return;
    }

    void Promise.all(
      pairs.map(([categoryId, subcategoryId]) =>
        productApiService
          .listByOwnerAndCategory(uid, categoryId, subcategoryId, {
            suppressErrorLog: true,
          })
          .catch(() => []),
      ),
    ).then((groups) => {
      if (cancelled) return;
      setImpactedProductCount(groups.flat().length);
    });

    return () => {
      cancelled = true;
    };
  }, [removals, selectedSubcategories, uid]);

  const removalDescription = React.useMemo(() => {
    if (removals.length === 0) return undefined;
    if (impactedProductCount === 0) {
      return locale === "ar"
        ? "سيتم إلغاء الاشتراك في التخصصات المحذوفة"
        : "Removed specialties will be unsubscribed";
    }
    return locale === "ar"
      ? `سيتم إلغاء الاشتراك في التخصصات المحذوفة. ${impactedProductCount} منتج مرتبط بها سيبقى خارج تخصصاتك المختارة.`
      : `Removed specialties will be unsubscribed. ${impactedProductCount} linked product(s) will fall outside your selected specialties.`;
  }, [impactedProductCount, locale, removals.length]);

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
    if (readOnly) return;

    // Exception: Delivery services (ID: 46) should not open subcategory dialog
    if (!categoryRequiresSubcategorySelection(category)) {
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
    const currentSubs = selectedSubcategories[categoryId] || [];
    const isAdding = !currentSubs.includes(subcategoryId);

    if (
      isAdding &&
      !unlimited &&
      !selectedSpecialties.includes(categoryId) &&
      selectedSpecialties.length >= 3
    ) {
      setToastMessage(
        locale === "ar"
          ? "لا يمكن اختيار أكثر من 3 تخصصات رئيسية"
          : "Cannot select more than 3 main categories",
      );
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    setSelectedSubcategories((prev) => {
      const previousSubs = prev[categoryId] || [];
      const newSubs = isAdding
        ? [...previousSubs, subcategoryId]
        : previousSubs.filter((s) => s !== subcategoryId);

      // Auto-select/deselect main category based on subcategory selection
      setSelectedSpecialties((prevMain) => {
        if (isAdding) {
          // Adding subcategory: ensure main category is selected
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
    const category = displayCategories.find(
      (cat) => cat.id.toString() === categoryId,
    );
    return category
      ? locale === "ar"
        ? category.nameAr
        : category.nameEn
      : categoryId;
  };

  const getSubcategoryName = (categoryId: string, subcategoryId: string) => {
    const category = displayCategories.find(
      (cat) => cat.id.toString() === categoryId,
    );
    if (!category) return subcategoryId;

    const subcategories = categoryService.getProfileSubOptions(
      category.id,
      category.isCollection,
    );

    // Try to find by originalId first, then by id, then by value (for collections)
    const subcategory = subcategories.find(
      (sub) =>
        sub.originalId?.toString() === subcategoryId ||
        sub.id.toString() === subcategoryId ||
        (sub.kind === "collection-member" &&
          sub.id.toString() === subcategoryId),
    );

    if (subcategory) {
      return locale === "ar" ? subcategory.nameAr : subcategory.nameEn;
    }

    // If not found, try to get from category tree for regular categories
    if (!category.isCollection) {
      const tree = categoryService.getCategoryTree(category.id);
      if (tree) {
        const treeSub = tree.subcategories.find(
          (sub) =>
            sub.originalId?.toString() === subcategoryId ||
            sub.id.toString() === subcategoryId,
        );
        if (treeSub) {
          return locale === "ar" ? treeSub.nameAr : treeSub.nameEn;
        }

        // Also check doctor appointment items (for Medical Services category)
        if (category.id === MEDICAL_SERVICES_CATEGORY_ID) {
          const doctorSub = tree.doctorAppointmentItems.find(
            (sub) =>
              sub.originalId?.toString() === subcategoryId ||
              sub.id.toString() === subcategoryId,
          );
          if (doctorSub) {
            return locale === "ar" ? doctorSub.nameAr : doctorSub.nameEn;
          }
        }
      }
    }

    return subcategoryId;
  };

  React.useEffect(() => {
    onStatusChange?.({
      isDirty,
      isSaving: false,
      canSave: true,
      label,
      description: removalDescription,
    });
  }, [isDirty, label, onStatusChange, removalDescription]);

  const removeMainSpecialty = (categoryId: string) => {
    setRemovals((current) => [...current, { categoryId }]);
    handleSpecialtyToggle(categoryId);
  };

  const removeSubSpecialty = (categoryId: string, subcategoryId: string) => {
    setRemovals((current) => [...current, { categoryId, subcategoryId }]);
    handleSubcategoryToggle(subcategoryId);
  };

  if (isLoading) {
    return (
      <div id='features-profile-presentation-specialtiescard-div-1-nav0zk' className="flex justify-center py-8">
        <LoadingSpinner id='features-profile-presentation-specialtiescard-loadingspinner-2-ttvcpp' size="lg" />
      </div>
    );
  }

  if (loadFailed) {
    return (
      <div
        id='features-profile-presentation-specialtiescard-div-3-tgwekh'
        className="space-y-3 rounded-xl border border-error/40 bg-error/10 p-4 text-center"
      >
        <p id='features-profile-presentation-specialtiescard-text-4-9lobcc' className="text-sm text-on-surface">
          {t("profile.specialties.loadFailed")}
        </p>
        <Button id='features-profile-presentation-specialtiescard-button-5-w8sbuv'
          type="button"
          variant="outline"
          onClick={() => void loadSpecialties()}
        >
          {t("common.retry")}
        </Button>
      </div>
    );
  }

  return (
    <>
      <div id='features-profile-presentation-specialtiescard-div-6-ai2xg3' className="space-y-4">
        <div id='features-profile-presentation-specialtiescard-div-7-8vy9og' className="grid grid-cols-4 gap-2 sm:gap-3 sm:grid-cols-6">
          {displayCategories.map((category) => {
            const categoryId = category.id.toString();
            const categoryName =
              locale === "ar" ? category.nameAr : category.nameEn;
            const imgSrc = category.imageUrl;

            return (
              <div
                key={category.id}
                className="relative flex flex-col gap-1 group transition-transform duration-200 active:scale-95"
                onClick={() => handleCategoryClick(category)}
              >
                <div className="relative aspect-[4/3.5] rounded-lg overflow-hidden border-2 border-transparent transition-all">
                  <div className="relative w-full h-full rounded-lg overflow-hidden bg-surface-bright transition-opacity">
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
                  <div onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      id={categoryId}
                      checked={selectedSpecialties.includes(categoryId)}
                      onCheckedChange={() => {
                        if (selectedSpecialties.includes(categoryId)) {
                          removeMainSpecialty(categoryId);
                        } else {
                          handleCategoryClick(category);
                        }
                      }}
                      disabled={readOnly}
                      className="h-4 w-4"
                    />
                  </div>
                  <Label
                    htmlFor={categoryId}
                    className="text-[10px] font-normal leading-3 truncate peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
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
          <div id='features-profile-presentation-specialtiescard-div-8-gt0wxf' className="grid grid-flow-col auto-cols-max grid-rows-2 gap-1.5 overflow-x-auto overscroll-x-contain pt-2">
            {selectedSpecialties.map((categoryId) => {
              const categoryName = getCategoryName(categoryId);
              const subIds = selectedSubcategories[categoryId] || [];

              return (
                <div
                  key={categoryId}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-surface-container-high border border-outline-variant/50"
                >
                  <span className="text-[11px] font-medium text-on-surface">
                    {categoryName}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeMainSpecialty(categoryId)}
                    className="p-0.5 rounded transition-colors"
                    aria-label={locale === "ar" ? "إزالة" : "Remove"}
                  >
                    <X className="h-3 w-3" />
                  </button>
                  {subIds.length > 0 && (
                    <div className="flex flex-nowrap gap-0.5 pl-1 border-l border-outline-variant/50">
                      {subIds.map((subId) => (
                        <div
                          key={subId}
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-surface-container border border-outline-variant/30"
                        >
                          <span className="text-[10px] text-on-surface-variant">
                            {getSubcategoryName(categoryId, subId)}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              removeSubSpecialty(categoryId, subId)
                            }
                            className="p-0.5 rounded transition-colors"
                            aria-label={locale === "ar" ? "إزالة" : "Remove"}
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
        <div id='features-profile-presentation-specialtiescard-div-9-8cntfx' className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div id='features-profile-presentation-specialtiescard-div-10-pkmj9r' className="bg-surface rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div id='features-profile-presentation-specialtiescard-div-11-zby0fu' className="flex items-center justify-between p-4 border-b border-outline-variant">
              <div id='features-profile-presentation-specialtiescard-div-12-sff3gg' className="flex items-center gap-3">
                {isDoctorAppointmentView && (
                  <button id='features-profile-presentation-specialtiescard-button-13-0gkodp'
                    type="button"
                    onClick={() => setIsDoctorAppointmentView(false)}
                    className="px-3 py-1.5 rounded-lg text-sm bg-surface-container transition-colors"
                  >
                    {locale === "ar" ? "\u0631\u062c\u0648\u0639" : "Back"}
                  </button>
                )}
                <h2 id='features-profile-presentation-specialtiescard-heading-14-g0wwvd' className="text-lg font-semibold text-on-surface">
                  {isDoctorAppointmentView
                    ? locale === "ar"
                      ? "\u0643\u0634\u0641 \u0637\u0628\u064a"
                      : "Doctor Appointment"
                    : locale === "ar"
                      ? selectedCategoryForDialog?.nameAr
                      : selectedCategoryForDialog?.nameEn}
                </h2>
              </div>
              <button id='features-profile-presentation-specialtiescard-button-15-mppzxh'
                type="button"
                onClick={() => setIsDialogOpen(false)}
                className="p-2 rounded-full transition-colors"
                aria-label="Close"
              >
                <X id='features-profile-presentation-specialtiescard-x-16-uacnux' className="h-5 w-5 text-on-surface-variant" />
              </button>
            </div>
            <div id='features-profile-presentation-specialtiescard-div-17-ruonbd' className="flex-1 overflow-y-auto p-4">
              {isLoadingSubcategories ? (
                <div id='features-profile-presentation-specialtiescard-div-18-79heiv' className="flex justify-center py-8">
                  <LoadingSpinner id='features-profile-presentation-specialtiescard-loadingspinner-19-qc9fvm' size="lg" />
                </div>
              ) : visibleSubcategories.length === 0 &&
                doctorAppointmentSubcategories.length === 0 ? (
                <p id='features-profile-presentation-specialtiescard-text-20-ipwntx' className="text-center text-on-surface-variant py-8">
                  {locale === "ar"
                    ? "لا توجد تخصصات فرعية"
                    : "No subcategories"}
                </p>
              ) : (
                <div id='features-profile-presentation-specialtiescard-div-21-ngrwmt' className="grid grid-cols-4 gap-2 sm:gap-3 sm:grid-cols-6">
                  {visibleSubcategories.map((subcategory) => {
                    const subcategoryId =
                      subcategory.originalId?.toString() ||
                      subcategory.id.toString();
                    const subcategoryName =
                      locale === "ar" ? subcategory.nameAr : subcategory.nameEn;
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
                            doctorSub.originalId?.toString() ||
                              doctorSub.id.toString(),
                          ),
                        )
                      : currentCategorySubs.includes(subcategoryId);

                    return (
                      <div
                        key={subcategory.id}
                        className={`relative flex flex-col gap-1 group ${
                          isGroup
                            ? "transition-transform duration-200 active:scale-95"
                            : ""
                        }`}
                        onClick={() => {
                          if (isGroup) setIsDoctorAppointmentView(true);
                        }}
                      >
                        <div className="relative aspect-[4/3.5] rounded-lg overflow-hidden border-2 border-transparent transition-all">
                          <div className="relative w-full h-full rounded-lg overflow-hidden bg-surface-bright transition-opacity">
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
                            className="text-[10px] font-normal leading-3 truncate peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
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
            <div id='features-profile-presentation-specialtiescard-div-22-8jodlv' className="p-4 border-t border-outline-variant flex flex-col gap-3">
              {selectedCategoryForDialog &&
                selectedSubcategories[selectedCategoryForDialog.id.toString()]
                  ?.length > 0 && (
                  <div id='features-profile-presentation-specialtiescard-div-23-ausrpg' className="flex flex-wrap gap-1.5">
                    {selectedSubcategories[
                      selectedCategoryForDialog.id.toString()
                    ].map((subId) => (
                      <div
                        key={subId}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-surface-container-high border border-outline-variant/50"
                      >
                        <span className="text-[11px] font-medium text-on-surface">
                          {getSubcategoryName(
                            selectedCategoryForDialog.id.toString(),
                            subId,
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            removeSubSpecialty(
                              selectedCategoryForDialog.id.toString(),
                              subId,
                            )
                          }
                          className="p-0.5 rounded transition-colors"
                          aria-label={locale === "ar" ? "إزالة" : "Remove"}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              <div id='features-profile-presentation-specialtiescard-div-24-gttzw7' className="flex justify-end">
                <button id='features-profile-presentation-specialtiescard-button-25-466atz'
                  type="button"
                  onClick={() => setIsDialogOpen(false)}
                  className="px-4 py-2 bg-primary text-on-primary rounded-lg font-medium transition-colors"
                >
                  {locale === "ar" ? "تم" : "Done"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <SpecialtiesToast message={toastMessage} />
    </>
  );
});

export default SpecialtiesCard;
