"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, ChevronLeft, Package, Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { CATEGORY_CONSTANTS, categoryService, type CategoryDisplay, type SubcategoryDisplay } from "@/features/categories";
import type { ProfileSpecialtiesSelection } from "@/features/profile/entities/profile-specialties.entity";
import type {
  ProfileSectionStatus,
  ProfileSpecialtiesController,
} from "./profile-save-controller";
import type { ProductRecord } from "@/features/product/entities/product.entity";
import { productApiService } from "@/features/product/services/product-api-service";

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
  const router = useRouter();
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
  const [productsBySubcategory, setProductsBySubcategory] = React.useState<
    Record<string, ProductRecord[]>
  >({});
  const [loadingProductBuckets, setLoadingProductBuckets] = React.useState<Set<string>>(new Set());
  const [selectedProduct, setSelectedProduct] = React.useState<ProductRecord | null>(null);
  const [pendingDelete, setPendingDelete] = React.useState<ProductRecord | null>(null);
  const [isDeletingProduct, setIsDeletingProduct] = React.useState(false);
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
      // Keep all collapsed by default
      setExpandedCategories(new Set());
      setExpandedSubcategories(new Set());
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
    setSelectedProduct(null);
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        // Close all other categories (accordion behavior)
        next.clear();
        next.add(categoryId);
      }
      return next;
    });
    // Also close all subcategories when switching categories
    setExpandedSubcategories(new Set());
  };

  const productBucketKey = (categoryId: string, subcategoryId: string) =>
    `${categoryId}:${subcategoryId}`;

  const loadProducts = React.useCallback(
    async (categoryId: string, subcategoryId: string) => {
      if (!uid) return;
      const key = productBucketKey(categoryId, subcategoryId);
      setLoadingProductBuckets((current) => new Set(current).add(key));
      try {
        const products = await productApiService.listByOwnerAndCategory(
          uid,
          categoryId,
          subcategoryId,
        );
        setProductsBySubcategory((current) => ({ ...current, [key]: products }));
      } catch (error) {
        console.error("Failed to load products for subcategory:", error);
        setProductsBySubcategory((current) => ({ ...current, [key]: [] }));
      } finally {
        setLoadingProductBuckets((current) => {
          const next = new Set(current);
          next.delete(key);
          return next;
        });
      }
    },
    [uid],
  );

  const toggleSubcategory = (categoryId: string, subcategoryId: string) => {
    setSelectedProduct(null);
    const key = productBucketKey(categoryId, subcategoryId);
    setExpandedSubcategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        // Close all other subcategories (accordion behavior)
        next.clear();
        next.add(key);
        void loadProducts(categoryId, subcategoryId);
      }
      return next;
    });
  };

  const editProduct = (product: ProductRecord) => {
    const query = new URLSearchParams({
      mode: "edit",
      productId: product.id,
      mainCategoryId: product.mainCategoryId,
      subcategoryId: product.subcategoryId,
      returnTo: "profile-products",
    });
    router.push(`/product?${query.toString()}`);
  };

  const viewProduct = (product: ProductRecord) => {
    const query = new URLSearchParams({
      mode: "view",
      productId: product.id,
      mainCategoryId: product.mainCategoryId,
      subcategoryId: product.subcategoryId,
      returnTo: "profile-products",
    });
    router.push(`/product?${query.toString()}`);
  };

  const confirmDeleteProduct = async () => {
    if (!pendingDelete || !uid) return;
    setIsDeletingProduct(true);
    try {
      await productApiService.delete(pendingDelete.id, uid);
      const key = productBucketKey(pendingDelete.mainCategoryId, pendingDelete.subcategoryId);
      setProductsBySubcategory((current) => ({
        ...current,
        [key]: (current[key] ?? []).filter((product) => product.id !== pendingDelete.id),
      }));
      setSelectedProduct(null);
      setPendingDelete(null);
    } catch (error) {
      console.error("Failed to delete product:", error);
    } finally {
      setIsDeletingProduct(false);
    }
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

  const doctorAppointmentIds = React.useMemo(
    () => new Set(categoryService.getDoctorAppointmentItems().map((item) => String(item.originalId))),
    [],
  );

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
            {locale === 'ar' ? 'اختر التخصصات من تبويب "التخصصات"' : 'Choose specialties in the "Specialties" tab'}
          </p>
        </div>
      ) : (
        <div className="space-y-2 sm:space-y-3">
          {selectedSpecialties.map((categoryId) => {
            const categoryName = getCategoryName(categoryId);
            const categoryImage = getCategoryImage(categoryId);
            const subIds = (selectedSubcategories[categoryId] || []).filter(
              (subId) =>
                categoryId !== String(CATEGORY_CONSTANTS.MEDICAL_SERVICES_ID) ||
                !doctorAppointmentIds.has(subId),
            );
            const isExpanded = expandedCategories.has(categoryId);

            return (
              <div key={categoryId} className="border border-outline-variant rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleCategory(categoryId)}
                  className="w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-surface-container-low hover:bg-surface-container transition-colors"
                >
                  <div className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-lg overflow-hidden bg-surface-bright flex-shrink-0">
                    {categoryImage && (
                      <Image
                        src={categoryImage}
                        alt={categoryName}
                        fill
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 text-start min-w-0">
                    <span className="text-xs sm:text-sm font-medium text-on-surface truncate">{categoryName}</span>
                    {subIds.length > 0 && (
                      <span className="text-[10px] sm:text-xs text-on-surface-variant block mt-0.5">
                        {locale === 'ar' ? `${subIds.length} تصنيف فرعي` : `${subIds.length} subcategories`}
                      </span>
                    )}
                  </div>
                  {locale === 'ar' ? (
                    isExpanded ? <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-on-surface-variant flex-shrink-0" /> : <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-on-surface-variant flex-shrink-0" />
                  ) : (
                    isExpanded ? <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-on-surface-variant flex-shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-on-surface-variant flex-shrink-0" />
                  )}
                </button>

                {isExpanded && subIds.length > 0 && (
                  <div className="border-t border-outline-variant/50 p-1.5 sm:p-2 space-y-1.5 sm:space-y-2 bg-surface">
                    {subIds.map((subId) => {
                      const subName = getSubcategoryName(categoryId, subId);
                      const subImage = getSubcategoryImage(categoryId, subId);
                      const bucketKey = productBucketKey(categoryId, subId);
                      const isSubExpanded = expandedSubcategories.has(bucketKey);
                      const products = productsBySubcategory[bucketKey] ?? [];
                      const isProductsLoading = loadingProductBuckets.has(bucketKey);

                      return (
                        <div key={subId} className="border border-outline-variant/50 rounded-md overflow-hidden">
                          <button
                            type="button"
                            onClick={() => toggleSubcategory(categoryId, subId)}
                            className="w-full flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 bg-surface-container-high/50 hover:bg-surface-container-high transition-colors"
                          >
                            <div className="relative h-7 w-7 sm:h-8 sm:w-8 rounded-md overflow-hidden bg-surface-bright flex-shrink-0">
                              {subImage && (
                                <Image
                                  src={subImage}
                                  alt={subName}
                                  fill
                                  className="object-cover"
                                />
                              )}
                            </div>
                            <span className="text-[10px] sm:text-xs font-medium text-on-surface flex-1 text-start truncate">{subName}</span>
                            {locale === 'ar' ? (
                              isSubExpanded ? <ChevronDown className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-on-surface-variant flex-shrink-0" /> : <ChevronLeft className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-on-surface-variant flex-shrink-0" />
                            ) : (
                              isSubExpanded ? <ChevronDown className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-on-surface-variant flex-shrink-0" /> : <ChevronRight className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-on-surface-variant flex-shrink-0" />
                            )}
                          </button>

                          {isSubExpanded && (
                            <div className="border-t border-outline-variant/30 bg-surface-container-low/30 relative min-h-[100px] sm:min-h-[120px]">
                              <div className="p-2 sm:p-3 pb-14 sm:pb-16">
                                {isProductsLoading ? (
                                  <div className="flex justify-center py-4">
                                    <LoadingSpinner size="sm" />
                                  </div>
                                ) : products.length > 0 ? (
                                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                    {products.map((product) => {
                                      const productName = product.data.fields["mainData.name"] ||
                                        (locale === "ar" ? "منتج بدون اسم" : "Unnamed product");
                                      const productImage = product.data.images[0]?.url;
                                      return (
                                        <div
                                          key={product.id}
                                          className="group relative overflow-hidden rounded-lg border border-outline-variant bg-surface text-start transition-colors hover:border-primary hover:shadow-sm"
                                        >
                                          {/* Clickable area to select product */}
                                          <button
                                            type="button"
                                            onClick={() => setSelectedProduct(product)}
                                            className={`w-full text-start focus:outline-none ${selectedProduct?.id === product.id ? 'ring-2 ring-primary' : ''}`}
                                          >
                                            <div className="relative aspect-square bg-surface-bright">
                                              {productImage ? (
                                                <Image src={productImage} alt={productName} fill className="object-cover" />
                                              ) : (
                                                <Package className="absolute inset-0 m-auto h-7 w-7 text-on-surface-variant" />
                                              )}
                                            </div>
                                            <p className="truncate px-2 py-1.5 text-[10px] font-medium sm:text-xs">
                                              {productName}
                                            </p>
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="text-center py-3 sm:py-4">
                                    <Package className="h-5 w-5 sm:h-6 sm:w-6 mx-auto text-on-surface-variant mb-1.5 sm:mb-2" />
                                    <p className="text-[10px] sm:text-xs text-on-surface-variant">
                                      {locale === 'ar' ? 'لا توجد منتجات مضافة بعد' : 'No products added yet'}
                                    </p>
                                  </div>
                                )}
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3 border-t border-outline-variant/50 bg-surface">
                                {selectedProduct ? (
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => viewProduct(selectedProduct)}
                                      className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-surface-container-high px-2 py-2 text-[10px] font-medium text-on-surface transition-colors hover:bg-primary hover:text-on-primary sm:py-2.5 sm:text-xs"
                                      title={locale === 'ar' ? 'عرض' : 'View'}
                                    >
                                      <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                      {locale === 'ar' ? 'عرض' : 'View'}
                                    </button>
                                    {!readOnly && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => editProduct(selectedProduct)}
                                          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-surface-container-high px-2 py-2 text-[10px] font-medium text-on-surface transition-colors hover:bg-primary hover:text-on-primary sm:py-2.5 sm:text-xs"
                                          title={locale === 'ar' ? 'تعديل' : 'Edit'}
                                        >
                                          <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                          {locale === 'ar' ? 'تعديل' : 'Edit'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setPendingDelete(selectedProduct)}
                                          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-surface-container-high px-2 py-2 text-[10px] font-medium text-destructive transition-colors hover:bg-destructive hover:text-on-destructive sm:py-2.5 sm:text-xs"
                                          title={locale === 'ar' ? 'حذف' : 'Delete'}
                                        >
                                          <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                          {locale === 'ar' ? 'حذف' : 'Delete'}
                                        </button>
                                      </>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => setSelectedProduct(null)}
                                      className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-surface-container-high px-2 py-2 text-[10px] font-medium text-on-surface transition-colors hover:bg-surface-container-high sm:py-2.5 sm:text-xs"
                                      title={locale === 'ar' ? 'إلغاء' : 'Cancel'}
                                    >
                                      {locale === 'ar' ? 'إلغاء' : 'Cancel'}
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-2 py-2 text-[10px] font-medium text-on-primary transition-colors hover:bg-primary/90 sm:py-2.5 sm:text-xs"
                                    onClick={() => {
                                      const query = new URLSearchParams({
                                        mode: "new",
                                        mainCategoryId: categoryId,
                                        subcategoryId: subId,
                                        returnTo: "profile-products",
                                      });
                                      router.push(`/product?${query.toString()}`);
                                    }}
                                  >
                                    <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                    {locale === 'ar' ? 'إضافة منتج' : 'Add Product'}
                                  </button>
                                )}
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
      {pendingDelete ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-surface p-5 shadow-xl">
            <h3 className="text-lg font-semibold">
              {locale === "ar" ? "حذف المنتج" : "Delete product"}
            </h3>
            <p className="mt-2 text-sm text-on-surface-variant">
              {locale === "ar"
                ? "سيتم حذف المنتج وصوره نهائيًا من التخزين. هل تريد المتابعة؟"
                : "The product and its stored images will be permanently deleted. Continue?"}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={isDeletingProduct}
                onClick={() => setPendingDelete(null)}
                className="rounded-lg border px-4 py-2 text-sm"
              >
                {locale === "ar" ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="button"
                disabled={isDeletingProduct}
                onClick={() => void confirmDeleteProduct()}
                className="rounded-lg bg-destructive px-4 py-2 text-sm text-destructive-foreground disabled:opacity-60"
              >
                {isDeletingProduct
                  ? locale === "ar" ? "جارٍ الحذف…" : "Deleting…"
                  : locale === "ar" ? "تأكيد الحذف" : "Confirm delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
});

export default ProductsCard;
