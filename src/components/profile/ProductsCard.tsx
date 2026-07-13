'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Package } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ProfileProductsTabs } from '@/components/ui/profile-products-tabs';
import { useProfileProductsTabs } from '@/features/profile-products';
import {
  EMPTY_PROFILE_SHOWCASE,
  type ProfileShowcaseSettings,
  type StoreDetailsData,
} from '@/features/profile/entities/store-details.entity';
import { useStoreDetails } from '@/features/profile/hooks/use-store-details';
import type { ProductRecord } from '@/features/product/entities/product.entity';
import { productApiService } from '@/features/product/services/product-api-service';
import type {
  ProfileSectionStatus,
  ProfileSpecialtiesController,
} from './profile-save-controller';
import { useTranslation } from '@/lib/i18n';

interface ProductsCardProps {
  uid: string;
  showSaveButton?: boolean;
  onStatusChange?: (status: ProfileSectionStatus) => void;
  readOnly?: boolean;
}

function cloneShowcase(showcase: ProfileShowcaseSettings): ProfileShowcaseSettings {
  return {
    featuredProductIds: [...showcase.featuredProductIds],
    trending: {
      label: showcase.trending.label,
      items: showcase.trending.items.map((item) => ({ ...item })),
    },
    customRequestEnabled: showcase.customRequestEnabled,
  };
}

function isShowcaseDirty(
  current: ProfileShowcaseSettings,
  baseline: ProfileShowcaseSettings,
): boolean {
  return JSON.stringify(current) !== JSON.stringify(baseline);
}

export const ProductsCard = React.forwardRef<
  ProfileSpecialtiesController,
  ProductsCardProps
>(function ProductsCard({ uid, onStatusChange, readOnly = false }, ref) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [pendingDelete, setPendingDelete] = React.useState<ProductRecord | null>(null);
  const [isDeletingProduct, setIsDeletingProduct] = React.useState(false);
  const [newTrendingText, setNewTrendingText] = React.useState('');
  const { details: storeDetails } = useStoreDetails();
  const label = t('onboarding.storeIdentity.products');
  const productsTabs = useProfileProductsTabs({
    uid,
    mode: readOnly ? 'preview' : 'edit',
    enabled: Boolean(uid),
    snapshotKeyPrefix: 'profile.products.card',
  });
  const [showcase, setShowcase] = React.useState<ProfileShowcaseSettings>(
    EMPTY_PROFILE_SHOWCASE,
  );
  const [savedShowcase, setSavedShowcase] =
    React.useState<ProfileShowcaseSettings>(EMPTY_PROFILE_SHOWCASE);
  const showcaseDirty = isShowcaseDirty(showcase, savedShowcase);

  React.useEffect(() => {
    const next = cloneShowcase(storeDetails.profileShowcase ?? EMPTY_PROFILE_SHOWCASE);
    setShowcase(next);
    setSavedShowcase(next);
  }, [storeDetails.profileShowcase]);

  React.useImperativeHandle(
    ref,
    () => ({
      isDirty: showcaseDirty,
      isSaving: false,
      canSave: true,
      label,
      save: async () => true,
      getSnapshot: () => productsTabs.selection,
      applySaved: productsTabs.setSelection,
      getStoreDetailsSnapshot: (): StoreDetailsData => ({
        ...storeDetails,
        profileShowcase: showcase,
      }),
      applyStoreDetailsSaved: (details: StoreDetailsData) => {
        const next = cloneShowcase(details.profileShowcase ?? EMPTY_PROFILE_SHOWCASE);
        setShowcase(next);
        setSavedShowcase(next);
      },
    }),
    [label, productsTabs, showcase, showcaseDirty, storeDetails],
  );

  React.useEffect(() => {
    onStatusChange?.({ isDirty: showcaseDirty, isSaving: false, canSave: true, label });
  }, [label, onStatusChange, showcaseDirty]);

  const viewProduct = (product: ProductRecord) => {
    const query = new URLSearchParams({
      mode: 'view',
      productId: product.id,
      mainCategoryId: product.mainCategoryId,
      subcategoryId: product.subcategoryId,
      returnTo: 'profile-products',
    });
    router.push(`/product?${query.toString()}`);
  };

  const editProduct = (product: ProductRecord) => {
    const query = new URLSearchParams({
      mode: 'edit',
      productId: product.id,
      mainCategoryId: product.mainCategoryId,
      subcategoryId: product.subcategoryId,
      returnTo: 'profile-products',
    });
    router.push(`/product?${query.toString()}`);
  };

  const addProduct = (mainCategoryId: string, subcategoryId: string) => {
    const query = new URLSearchParams({
      mode: 'new',
      mainCategoryId,
      subcategoryId,
      returnTo: 'profile-products',
    });
    router.push(`/product?${query.toString()}`);
  };

  const confirmDeleteProduct = async () => {
    if (!pendingDelete || !uid) return;
    setIsDeletingProduct(true);
    try {
      await productApiService.delete(pendingDelete.id, uid);
      productsTabs.removeProductFromCurrentBucket(pendingDelete.id);
      setPendingDelete(null);
    } finally {
      setIsDeletingProduct(false);
    }
  };

  const toggleFeaturedProduct = (product: ProductRecord) => {
    setShowcase((current) => {
      const exists = current.featuredProductIds.includes(product.id);
      return {
        ...current,
        featuredProductIds: exists
          ? current.featuredProductIds.filter((id) => id !== product.id)
          : [product.id, ...current.featuredProductIds].slice(0, 20),
      };
    });
  };

  const addTrendingItem = () => {
    const text = newTrendingText.trim();
    if (!text) return;
    setNewTrendingText('');
    setShowcase((current) => ({
      ...current,
      trending: {
        ...current.trending,
        items: [...current.trending.items, { id: `trending-${Date.now()}`, label: text }].slice(0, 20),
      },
    }));
  };

  const removeTrendingItem = (id: string) => {
    setShowcase((current) => ({
      ...current,
      trending: {
        ...current.trending,
        items: current.trending.items.filter((item) => item.id !== id),
      },
    }));
  };

  const updateTrendingLabel = (value: string) => {
    setShowcase((current) => ({
      ...current,
      trending: {
        ...current.trending,
        label: value.trim() || EMPTY_PROFILE_SHOWCASE.trending.label,
      },
    }));
  };

  const toggleCustomRequest = () => {
    setShowcase((current) => ({
      ...current,
      customRequestEnabled: !current.customRequestEnabled,
    }));
  };

  return (
    <div className="space-y-4">
      <ProfileProductsTabs
        mode={readOnly ? 'preview' : 'edit'}
        tabs={productsTabs.tabs}
        selectedMainId={productsTabs.selectedMainId}
        selectedSubId={productsTabs.selectedSubId}
        products={productsTabs.activeProducts}
        activeSubTab={productsTabs.activeSubTab}
        filters={productsTabs.filters}
        featuredProductIds={showcase.featuredProductIds}
        isLoadingTabs={productsTabs.isLoadingTabs}
        isLoadingProducts={productsTabs.isLoadingProducts}
        labels={{
          title: t('onboarding.storeIdentity.products'),
          hint: t('onboarding.storeIdentity.productsHint'),
          searchPlaceholder: locale === 'ar' ? 'ابحث داخل المنتجات' : 'Search products',
          emptySpecialties:
            locale === 'ar'
              ? 'لم يتم اختيار أي تخصصات بعد'
              : 'No specialties selected yet',
          emptyProducts:
            locale === 'ar'
              ? 'لا توجد منتجات مضافة في هذا التصنيف'
              : 'No products in this category yet',
          view: locale === 'ar' ? 'عرض' : 'View',
          edit: locale === 'ar' ? 'تعديل' : 'Edit',
          delete: locale === 'ar' ? 'حذف' : 'Delete',
          addProduct: locale === 'ar' ? 'إضافة منتج' : 'Add product',
          addFeatured: locale === 'ar' ? 'إضافة للمميزة' : 'Add featured',
          removeFeatured: locale === 'ar' ? 'إزالة من المميزة' : 'Remove featured',
          sortNewest: locale === 'ar' ? 'الأحدث' : 'Newest',
          sortOldest: locale === 'ar' ? 'الأقدم' : 'Oldest',
          sortName: locale === 'ar' ? 'الاسم' : 'Name',
        }}
        onSelectMain={productsTabs.selectMain}
        onSelectSub={productsTabs.selectSub}
        onFiltersChange={productsTabs.updateFilters}
        onViewProduct={viewProduct}
        onEditProduct={!readOnly ? editProduct : undefined}
        onDeleteProduct={!readOnly ? setPendingDelete : undefined}
        onAddProduct={!readOnly ? addProduct : undefined}
        onToggleFeatured={!readOnly ? toggleFeaturedProduct : undefined}
      />

      {!readOnly ? (
        <section className="rounded-xl border border-outline-variant bg-surface-container-low/40 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-semibold text-on-surface">
                {locale === 'ar' ? 'عرض البروفايل' : 'Profile display'}
              </h4>
              <p className="text-xs text-on-surface-variant">
                {locale === 'ar'
                  ? 'اختر المنتجات المميزة ونصوص الأكثر رواجًا وزر الطلب الخاص.'
                  : 'Choose featured products, trending texts, and custom request button.'}
              </p>
            </div>
            <button
              type="button"
              onClick={toggleCustomRequest}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                showcase.customRequestEnabled
                  ? 'bg-primary text-on-primary'
                  : 'border border-outline-variant bg-surface text-on-surface'
              }`}
            >
              {showcase.customRequestEnabled
                ? locale === 'ar'
                  ? 'الطلب الخاص مفعل'
                  : 'Custom request enabled'
                : locale === 'ar'
                  ? 'تفعيل الطلب الخاص'
                  : 'Enable custom request'}
            </button>
          </div>

          <div className="mt-4 grid gap-3">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-on-surface">
                {locale === 'ar' ? 'عنوان شريط الأكثر رواجًا' : 'Trending title'}
              </label>
              <Input
                value={showcase.trending.label}
                maxLength={80}
                onChange={(event) => updateTrendingLabel(event.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Input
                value={newTrendingText}
                onChange={(event) => setNewTrendingText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addTrendingItem();
                  }
                }}
                placeholder={
                  locale === 'ar'
                    ? 'أضف نصًا يظهر في الأكثر رواجًا'
                    : 'Add a trending display text'
                }
                maxLength={80}
              />
              <button
                type="button"
                onClick={addTrendingItem}
                disabled={!newTrendingText.trim()}
                className="rounded-lg bg-primary px-4 text-xs font-semibold text-on-primary disabled:opacity-60"
              >
                {locale === 'ar' ? 'إضافة' : 'Add'}
              </button>
            </div>
            {showcase.trending.items.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {showcase.trending.items.map((item) => (
                  <span
                    key={item.id}
                    className="inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface px-3 py-1 text-xs"
                  >
                    {item.label}
                    <button
                      type="button"
                      onClick={() => removeTrendingItem(item.id)}
                      className="text-destructive"
                      aria-label={locale === 'ar' ? 'حذف النص' : 'Remove text'}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
            <p className="text-xs text-on-surface-variant">
              {locale === 'ar'
                ? `عدد المنتجات المميزة المختارة: ${showcase.featuredProductIds.length}`
                : `Featured products selected: ${showcase.featuredProductIds.length}`}
            </p>
          </div>
        </section>
      ) : null}

      {pendingDelete ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-surface p-5 shadow-xl">
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <Package className="h-5 w-5" />
              {locale === 'ar' ? 'حذف المنتج' : 'Delete product'}
            </h3>
            <p className="mt-2 text-sm text-on-surface-variant">
              {locale === 'ar'
                ? 'سيتم حذف المنتج وصوره نهائيًا من التخزين. هل تريد المتابعة؟'
                : 'The product and its stored images will be permanently deleted. Continue?'}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={isDeletingProduct}
                onClick={() => setPendingDelete(null)}
                className="rounded-lg border px-4 py-2 text-sm"
              >
                {locale === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={isDeletingProduct}
                onClick={() => void confirmDeleteProduct()}
                className="rounded-lg bg-destructive px-4 py-2 text-sm text-destructive-foreground disabled:opacity-60"
              >
                {isDeletingProduct
                  ? locale === 'ar'
                    ? 'جار الحذف...'
                    : 'Deleting...'
                  : locale === 'ar'
                    ? 'تأكيد الحذف'
                    : 'Confirm delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
});

export default ProductsCard;
