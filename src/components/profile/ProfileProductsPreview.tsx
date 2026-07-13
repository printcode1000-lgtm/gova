'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ProfileProductsTabs } from '@/components/ui/profile-products-tabs';
import { useProfileProductsTabs } from '@/features/profile-products';
import type { ProductRecord } from '@/features/product/entities/product.entity';
import { useTranslation } from '@/lib/i18n';

interface ProfileProductsPreviewProps {
  uid: string;
}

export function ProfileProductsPreview({ uid }: ProfileProductsPreviewProps) {
  const router = useRouter();
  const { locale } = useTranslation();
  const productsTabs = useProfileProductsTabs({
    uid,
    mode: 'preview',
    enabled: Boolean(uid),
    snapshotKeyPrefix: 'profile.products.preview',
  });

  const viewProduct = (product: ProductRecord) => {
    const query = new URLSearchParams({
      mode: 'view',
      productId: product.id,
      mainCategoryId: product.mainCategoryId,
      subcategoryId: product.subcategoryId,
      returnTo: 'profile-preview',
    });
    router.push(`/product?${query.toString()}`);
  };

  if (!uid) return null;

  return (
    <ProfileProductsTabs
      mode="preview"
      tabs={productsTabs.tabs}
      selectedMainId={productsTabs.selectedMainId}
      selectedSubId={productsTabs.selectedSubId}
      products={productsTabs.activeProducts}
      activeSubTab={productsTabs.activeSubTab}
      filters={productsTabs.filters}
      isLoadingTabs={productsTabs.isLoadingTabs}
      isLoadingProducts={productsTabs.isLoadingProducts}
      labels={{
        title: locale === 'ar' ? 'منتجات وخدمات البائع' : 'Seller products and services',
        hint:
          locale === 'ar'
            ? 'تصفح المنتجات حسب تخصصات البائع'
            : 'Browse products by seller specialty',
        searchPlaceholder: locale === 'ar' ? 'ابحث داخل المنتجات' : 'Search products',
        emptySpecialties:
          locale === 'ar' ? 'لا توجد تخصصات متاحة للعرض' : 'No specialties available',
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
    />
  );
}

export default ProfileProductsPreview;
