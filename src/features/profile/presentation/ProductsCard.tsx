'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/shared/ui/input';
import { ProfileProductsTabs } from '@/features/profile-products/ui';
import { useProfileProductsTabs } from '@/features/profile-products';
import {
  EMPTY_PROFILE_SHOWCASE,
  type ProfileShowcaseSettings,
  type StoreDetailsData,
} from '@/features/profile/domain/store-details.entity';
import { useStoreDetails } from '@/features/profile/presentation/hooks/use-store-details';
import type { ProductRecord } from '@/features/product';
import { productApiService } from '@/features/product/ui';
import type {
  ProfileSectionStatus,
  ProfileSpecialtiesController,
} from './profile-save-controller';
import { useTranslation } from '@/shared/i18n';
import { cloneShowcase, isShowcaseDirty } from './products-card-model';
import { usePageSaveOperations } from '@/features/page-save/ui';
import { uiAttributes , createOpaqueUiInstanceId} from "@asol/ui-registry-core";

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
    <div {...uiAttributes({ uid: "profile.products-card.div.8-REO9RC", id: "profile.products-card.div.8" })} id="profile.products-card.div" className="space-y-4">
      <ProfileProductsTabs id="profile.products-card.profile-products-tabs"
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
        <section {...uiAttributes({ uid: "profile.products-card.section.3-4Q3H72", id: "profile.products-card.section.3" })} id="profile.products-card.section" className="rounded-xl border border-outline-variant bg-surface-container-low/40 p-3">
          <div {...uiAttributes({ uid: "profile.products-card.div.9-f9hwiV", id: "profile.products-card.div.9" })} id="profile.products-card.div.2" className="flex flex-wrap items-center justify-between gap-2">
            <div {...uiAttributes({ uid: "profile.products-card.div.10-xea4jU", id: "profile.products-card.div.10" })} id="profile.products-card.div.3">
              <h4 {...uiAttributes({ uid: "profile.products-card.h4.2-L7YF9F", id: "profile.products-card.h4.2" })} id="profile.products-card.h4" className="text-sm font-semibold text-on-surface">
                {locale === 'ar' ? 'عرض البروفايل' : 'Profile display'}
              </h4>
              <p {...uiAttributes({ uid: "profile.products-card.p.3-f2HmMG", id: "profile.products-card.p.3" })} id="profile.products-card.p" className="text-xs text-on-surface-variant">
                {locale === 'ar'
                  ? 'اختر المنتجات المميزة ونصوص الأكثر رواجًا التي تظهر للزوار.'
                  : 'Choose featured products and trending texts shown to visitors.'}
              </p>
            </div>
          </div>

          <div {...uiAttributes({ uid: "profile.products-card.div.11-VYa5WZ", id: "profile.products-card.div.11" })} id="profile.products-card.div.4" className="mt-4 grid gap-3">
            <div {...uiAttributes({ uid: "profile.products-card.div.12-O3HxW6", id: "profile.products-card.div.12" })} id="profile.products-card.div.5" className="space-y-2">
              <label {...uiAttributes({ uid: "profile.products-card.label.3-POVp0x", id: "profile.products-card.label.3" })} id="profile.products-card.label" className="text-xs font-semibold text-on-surface">
                {locale === 'ar' ? 'عنوان شريط الأكثر رواجًا' : 'Trending title'}
              </label>
              <Input id="profile.products-card.input.2" ui={{ uid: "profile.products.trending-label-SPQER4", id: "profile.products.trending-label", kind: "field", part: "showcase" }}
                value={showcase.trending.label}
                maxLength={80}
                onChange={(event) => updateTrendingLabel(event.target.value)}
              />
            </div>
            <div {...uiAttributes({ uid: "profile.products-card.div.13-61bfBq", id: "profile.products-card.div.13" })} id="profile.products-card.div.6" className="flex gap-2">
              <Input id="profile.products-card.input.3" ui={{ uid: "profile.products.new-trending-text-9Ds1MH", id: "profile.products.new-trending-text", kind: "field", part: "showcase" }}
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
              <button {...uiAttributes({ uid: "profile.products-card.button.2-cm3rH3", id: "profile.products-card.button.2" })} id="profile.products-card.button"
                type="button"
                onClick={addTrendingItem}
                disabled={!newTrendingText.trim()}
                className="rounded-lg bg-primary px-4 text-xs font-semibold text-on-primary disabled:opacity-60"
              >
                {locale === 'ar' ? 'إضافة' : 'Add'}
              </button>
            </div>
            {showcase.trending.items.length > 0 ? (
              <div {...uiAttributes({ uid: "profile.products-card.div.14-dA8Whr", id: "profile.products-card.div.14" })} id="profile.products-card.div.7" className="flex flex-wrap gap-2">
                {showcase.trending.items.map((item) => (
                  <span
                    key={item.id} {...uiAttributes({ uid: "profile.products-card.span.5-MxGo8y", id: "profile.products-card.span.5" , instance: createOpaqueUiInstanceId("iter-7e5c0faa23", String(item.id))})}
                    className="inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface px-3 py-1 text-xs"
                  >
                    {item.label}
                    <button {...uiAttributes({ uid: "profile.products-card.button.3-EE2L5g", id: "profile.products-card.button.3" , instance: createOpaqueUiInstanceId("iter-49a00fb1da", String(item.id))})}
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
            <p {...uiAttributes({ uid: "profile.products-card.p.4-QbI7ln", id: "profile.products-card.p.4" })} id="profile.products-card.p.2" className="text-xs text-on-surface-variant">
              {locale === 'ar'
                ? `عدد المنتجات المميزة المختارة: ${showcase.featuredProductIds.length}`
                : `Featured products selected: ${showcase.featuredProductIds.length}`}
            </p>
          </div>
        </section>
      ) : null}

      {!readOnly ? (
        <section {...uiAttributes({ uid: "profile.products-card.section.4-E0fhIT", id: "profile.products-card.section.4" })} id="profile.products-card.section.2" className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <label {...uiAttributes({ uid: "profile.products-card.label.4-NB3VN9", id: "profile.products-card.label.4" })} id="profile.products-card.label.2" className="flex items-center justify-between gap-4">
            <span {...uiAttributes({ uid: "profile.products-card.span.6-n0Pzh3", id: "profile.products-card.span.6" })} id="profile.products-card.span" className="min-w-0">
              <span {...uiAttributes({ uid: "profile.products-card.span.7-0WQMgG", id: "profile.products-card.span.7" })} id="profile.products-card.span.2" className="block text-sm font-semibold text-on-surface">
                {locale === 'ar' ? 'الطلب الخاص' : 'Custom requests'}
              </span>
              <span {...uiAttributes({ uid: "profile.products-card.span.8-6EwGK5", id: "profile.products-card.span.8" })} id="profile.products-card.span.3" className="mt-1 block text-xs leading-5 text-on-surface-variant">
                {locale === 'ar'
                  ? 'يسمح للعميل بإرسال وصف وصور لطلب غير موجود ضمن منتجاتك، لتراجعه وترد عليه من الطلبات.'
                  : 'Lets customers send a description and images for an item not listed in your products.'}
              </span>
            </span>
            <input {...uiAttributes({ uid: "profile.products-card.input.4-yVs7vW", id: "profile.products-card.input.4" })} id="profile.products-card.input"
              type="checkbox"
              className="peer sr-only"
              checked={showcase.customRequestEnabled}
              onChange={toggleCustomRequest}
            />
            <span {...uiAttributes({ uid: "profile.products-card.span.9-TD2Rki", id: "profile.products-card.span.9" })} id="profile.products-card.span.4" className="relative h-7 w-12 shrink-0 rounded-full bg-outline-variant transition peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 after:absolute after:start-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-5 rtl:peer-checked:after:-translate-x-5" />
          </label>
        </section>
      ) : null}
    </div>
  );
});

export default ProductsCard;
