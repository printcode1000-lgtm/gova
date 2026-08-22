'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
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
import { cloneShowcase, isShowcaseDirty } from './products-card-model';
import { usePageSaveOperations } from '@/features/page-save/hooks/use-page-save-operations';

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
  const productDeletions = usePageSaveOperations('profile-edit');
  const [newTrendingText, setNewTrendingText] = React.useState('');
  const [featuredProducts, setFeaturedProducts] = React.useState<ProductRecord[]>([]);
  const [isLoadingFeaturedProducts, setIsLoadingFeaturedProducts] = React.useState(false);
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

  React.useEffect(() => {
    const ids = showcase.featuredProductIds;
    if (ids.length === 0) {
      setFeaturedProducts([]);
      setIsLoadingFeaturedProducts(false);
      return;
    }
    let cancelled = false;
    setIsLoadingFeaturedProducts(true);
    void Promise.all(
      ids.map((id) =>
        productApiService.get(id, { suppressErrorLog: true }).catch((error) => {
          console.warn("[ProductsCard] Featured product could not be loaded", {
            productId: id,
            error,
          });
          return null;
        }),
      ),
    ).then((items) => {
      if (!cancelled) {
        setFeaturedProducts(
          items.filter(
            (item): item is ProductRecord => Boolean(item && item.uid === uid),
          ),
        );
        setIsLoadingFeaturedProducts(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [showcase.featuredProductIds, uid]);

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

  const stageProductDeletion = (product: ProductRecord) => {
    if (!uid) return;
    productDeletions.stage({
      itemId: `product-delete:${product.id}`,
      kind: 'delete',
      label:
        locale === 'ar'
          ? `حذف المنتج: ${product.mainData.name}`
          : `Delete product: ${product.mainData.name}`,
      execute: async () => {
        await productApiService.delete(product.id, uid);
        productsTabs.removeProductFromCurrentBucket(product.id);
      },
    });
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
        ownerUid={uid}
        mode={readOnly ? 'preview' : 'edit'}
        tabs={productsTabs.tabs}
        selectedMainId={productsTabs.selectedMainId}
        selectedSubId={productsTabs.selectedSubId}
        products={productsTabs.activeProducts}
        activeSubTab={productsTabs.activeSubTab}
        filters={productsTabs.filters}
        featuredProductIds={showcase.featuredProductIds}
        featuredProducts={featuredProducts}
        isLoadingFeaturedProducts={isLoadingFeaturedProducts}
        isLoadingTabs={productsTabs.isLoadingTabs}
        isLoadingProducts={productsTabs.isLoadingProducts}
        labels={{
          title: t('onboarding.storeIdentity.products'),
          hint: t('onboarding.storeIdentity.productsHint'),
          searchTitle: locale === 'ar' ? 'البحث في منتجاتك' : 'Search your products',
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
          delete: locale === 'ar' ? 'إضافة الحذف للحفظ' : 'Stage delete',
          addProduct: locale === 'ar' ? 'إضافة منتج' : 'Add product',
          addFeatured: locale === 'ar' ? 'إضافة للمميزة' : 'Add featured',
          removeFeatured: locale === 'ar' ? 'إزالة من المميزة' : 'Remove featured',
          sortNewest: locale === 'ar' ? 'الأحدث' : 'Newest',
          sortOldest: locale === 'ar' ? 'الأقدم' : 'Oldest',
          sortName: locale === 'ar' ? 'الاسم' : 'Name',
          featuredOnly: locale === 'ar' ? 'المميزة فقط' : 'Featured only',
        }}
        onSelectMain={productsTabs.selectMain}
        onSelectSub={productsTabs.selectSub}
        onFiltersChange={productsTabs.updateFilters}
        onViewProduct={viewProduct}
        onEditProduct={!readOnly ? editProduct : undefined}
        onDeleteProduct={!readOnly ? stageProductDeletion : undefined}
        onAddProduct={!readOnly ? addProduct : undefined}
        onToggleFeatured={!readOnly ? toggleFeaturedProduct : undefined}
        onRefreshProducts={productsTabs.refetchActiveProducts}
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
                  ? 'اختر المنتجات المميزة ونصوص الأكثر رواجًا التي تظهر للزوار.'
                  : 'Choose featured products and trending texts shown to visitors.'}
              </p>
            </div>
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
                      aria-label={locale === 'ar' ? 'إزالة النص' : 'Remove text'}
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

      {!readOnly ? (
        <section className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <label className="flex items-center justify-between gap-4">
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-on-surface">
                {locale === 'ar' ? 'الطلب الخاص' : 'Custom requests'}
              </span>
              <span className="mt-1 block text-xs leading-5 text-on-surface-variant">
                {locale === 'ar'
                  ? 'يسمح للعميل بإرسال وصف وصور لطلب غير موجود ضمن منتجاتك، لتراجعه وترد عليه من الطلبات.'
                  : 'Lets customers send a description and images for an item not listed in your products.'}
              </span>
            </span>
            <input
              type="checkbox"
              className="peer sr-only"
              checked={showcase.customRequestEnabled}
              onChange={toggleCustomRequest}
            />
            <span className="relative h-7 w-12 shrink-0 rounded-full bg-outline-variant transition peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 after:absolute after:start-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-5 rtl:peer-checked:after:-translate-x-5" />
          </label>
        </section>
      ) : null}
    </div>
  );
});

export default ProductsCard;
