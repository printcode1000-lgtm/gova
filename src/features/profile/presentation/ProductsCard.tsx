'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, TrendingUp } from 'lucide-react';
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
import STATIC_DOM_IDS from '@/shared/dom/identity/static-ids.json';

interface ProductsCardProps {
  uid: string;
  showSaveButton?: boolean;
  onStatusChange?: (status: ProfileSectionStatus) => void;
  readOnly?: boolean;
  profileShowcaseOpen?: boolean;
  onToggleProfileShowcase?: () => void;
}

export const ProductsCard = React.forwardRef<
  ProfileSpecialtiesController,
  ProductsCardProps
>(function ProductsCard({
  uid,
  onStatusChange,
  readOnly = false,
  profileShowcaseOpen = true,
  onToggleProfileShowcase,
}, ref) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const productDeletions = usePageSaveOperations('profile-edit');
  const [profileShowcasePortalTarget, setProfileShowcasePortalTarget] =
    React.useState<HTMLElement | null>(null);
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
    const resolvePortalTarget = () => {
      const target = document.getElementById(
        STATIC_DOM_IDS.ids.profile.storeIdentityCardRoot,
      );
      if (!target) return false;
      setProfileShowcasePortalTarget(target);
      return true;
    };

    if (resolvePortalTarget()) return;
    const observer = new MutationObserver(() => {
      if (resolvePortalTarget()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

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

  return (
    <div id='features-profile-presentation-productscard-div-1-ayditq' className="space-y-4">
      <ProfileProductsTabs id='features-profile-presentation-productscard-profileproductstabs-2-2ekrxl'
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

      {!readOnly && profileShowcasePortalTarget
        ? createPortal(
            <section id='features-profile-presentation-productscard-section-3-mqxepy' className="rounded-xl border border-outline-variant bg-surface-container-low/40 p-3">
          <div id='features-profile-presentation-productscard-div-4-mrc96i'>
            <button
              id='features-profile-presentation-productscard-button-16-a4c2f7'
              type="button"
              onClick={onToggleProfileShowcase}
              disabled={!onToggleProfileShowcase}
              aria-expanded={profileShowcaseOpen}
              aria-controls="features-profile-presentation-productscard-div-8-bhfpsg"
              className="flex w-full items-center justify-between gap-3 text-start disabled:cursor-default"
            >
              <span id='features-profile-presentation-productscard-div-5-xcmjsg' className="flex min-w-0 items-center gap-2">
                <TrendingUp
                  id='features-profile-presentation-productscard-trendingup-18-c8f4b2'
                  className="h-4 w-4 shrink-0 text-primary"
                  aria-hidden
                />
                <span id='features-profile-presentation-productscard-heading-6-q3prsv' className="block text-sm font-semibold text-on-surface">
                  {locale === 'ar' ? 'شريط الأكثر رواجًا' : 'Trending bar'}
                </span>
              </span>
              {onToggleProfileShowcase ? (
                <ChevronDown
                  id='features-profile-presentation-productscard-chevrondown-17-b5d3e8'
                  className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${profileShowcaseOpen ? 'rotate-180' : ''}`}
                  aria-hidden
                />
              ) : null}
            </button>
          </div>

          {profileShowcaseOpen ? (
          <div id='features-profile-presentation-productscard-div-8-bhfpsg' className="mt-4 grid gap-3">
            <p id='features-profile-presentation-productscard-text-7-ys6tmc' className="text-xs text-on-surface-variant">
              {locale === 'ar'
                ? 'تحكم في محتوى الأكثر رواجًا الذي يظهر للزوار.'
                : 'Control the trending content shown to visitors.'}
            </p>
            <div id='features-profile-presentation-productscard-div-9-mxirue' className="space-y-2">
              <label id='features-profile-presentation-productscard-label-10-9jamgw' className="text-xs font-semibold text-on-surface">
                {locale === 'ar' ? 'عنوان قسم الأكثر رواجًا' : 'Trending section title'}
              </label>
              <Input id='features-profile-presentation-productscard-input-11-tew4dx'
                value={showcase.trending.label}
                maxLength={80}
                onChange={(event) => updateTrendingLabel(event.target.value)}
              />
            </div>
            <div id='features-profile-presentation-productscard-div-12-bt5qic' className="flex gap-2">
              <Input id='features-profile-presentation-productscard-input-13-bidh95'
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
                    ? 'أضف عنصرًا إلى قسم الأكثر رواجًا'
                    : 'Add an item to the trending section'
                }
                maxLength={80}
              />
              <button id='features-profile-presentation-productscard-button-14-f9mfwe'
                type="button"
                onClick={addTrendingItem}
                disabled={!newTrendingText.trim()}
                className="rounded-lg bg-primary px-4 text-xs font-semibold text-on-primary disabled:opacity-60"
              >
                {locale === 'ar' ? 'إضافة' : 'Add'}
              </button>
            </div>
            {showcase.trending.items.length > 0 ? (
              <div id='features-profile-presentation-productscard-div-15-q3oi7h' className="flex flex-wrap gap-2">
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
                      aria-label={locale === 'ar' ? 'إزالة العنصر' : 'Remove item'}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          ) : null}
            </section>,
            profileShowcasePortalTarget,
          )
        : null}

    </div>
  );
});

export default ProductsCard;
