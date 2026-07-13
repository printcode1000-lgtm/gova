'use client';

import * as React from 'react';
import { useSnapshotState } from '@/features/page-snapshot';
import { CATEGORY_CONSTANTS, categoryService } from '@/features/categories';
import { productApiService } from '@/features/product/services/product-api-service';
import type { ProductRecord } from '@/features/product/entities/product.entity';
import {
  EMPTY_PROFILE_SPECIALTIES,
  type ProfileSpecialtiesSelection,
} from '@/features/profile/entities/profile-specialties.entity';
import { profileService } from '@/features/profile/services/profile-service';
import { useTranslation } from '@/lib/i18n';
import type {
  ProfileProductsFilters,
  ProfileProductsMainTab,
  ProfileProductsSubTab,
  UseProfileProductsTabsInput,
} from '../entities/profile-products.types';

const EMPTY_FILTERS: ProfileProductsFilters = {
  searchText: '',
  sortBy: 'newest',
  extra: {},
};

const bucketKey = (categoryId: string, subcategoryId: string) =>
  `${categoryId}:${subcategoryId}`;

function normalizeSelection(selection: ProfileSpecialtiesSelection): ProfileSpecialtiesSelection {
  return {
    main: selection.main.map(Number),
    sub: Object.fromEntries(
      Object.entries(selection.sub).map(([key, values]) => [
        String(key),
        values.map(Number),
      ]),
    ),
  };
}

function subProductId(sub: { id: number | string; originalId?: number }): string {
  return String(sub.originalId ?? sub.id);
}

function productName(product: ProductRecord): string {
  return product.data.fields['mainData.name'] || '';
}

function sortProducts(products: ProductRecord[], sortBy: ProfileProductsFilters['sortBy']) {
  const next = [...products];
  if (sortBy === 'name') {
    next.sort((a, b) => productName(a).localeCompare(productName(b), 'ar'));
    return next;
  }
  next.sort((a, b) => {
    const left = new Date(a.createdAt).getTime();
    const right = new Date(b.createdAt).getTime();
    return sortBy === 'oldest' ? left - right : right - left;
  });
  return next;
}

function normalizeFilters(filters: ProfileProductsFilters): ProfileProductsFilters {
  const sortBy =
    filters.sortBy === 'oldest' || filters.sortBy === 'name' ? filters.sortBy : 'newest';
  return {
    searchText: typeof filters.searchText === 'string' ? filters.searchText : '',
    sortBy,
    extra: filters.extra && typeof filters.extra === 'object' ? filters.extra : {},
  };
}

export function useProfileProductsTabs({
  uid,
  mode,
  enabled = true,
  snapshotKeyPrefix = 'profile-products',
  includeDoctorAppointmentItems = false,
}: UseProfileProductsTabsInput) {
  const { locale } = useTranslation();
  const [selection, setSelection] =
    React.useState<ProfileSpecialtiesSelection>(EMPTY_PROFILE_SPECIALTIES);
  const [isLoadingTabs, setIsLoadingTabs] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [productsByBucket, setProductsByBucket] = React.useState<
    Record<string, ProductRecord[]>
  >({});
  const [loadingBuckets, setLoadingBuckets] = React.useState<Set<string>>(new Set());
  const [selectedMainId, setSelectedMainId] = useSnapshotState(
    `${snapshotKeyPrefix}.${mode}.main`,
    '',
  );
  const [selectedSubId, setSelectedSubId] = useSnapshotState(
    `${snapshotKeyPrefix}.${mode}.sub`,
    '',
  );
  const [filters, setFilters] = useSnapshotState<ProfileProductsFilters>(
    `${snapshotKeyPrefix}.${mode}.filters`,
    EMPTY_FILTERS,
  );
  const normalizedFilters = React.useMemo(() => normalizeFilters(filters), [filters]);

  React.useEffect(() => {
    if (!enabled || !uid) {
      setIsLoadingTabs(false);
      return;
    }
    let cancelled = false;
    setIsLoadingTabs(true);
    profileService
      .getSpecialties(uid)
      .then((next) => {
        if (!cancelled) {
          setSelection(normalizeSelection(next));
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setSelection(EMPTY_PROFILE_SPECIALTIES);
          setError(err instanceof Error ? err.message : String(err));
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingTabs(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, uid]);

  const doctorAppointmentIds = React.useMemo(
    () =>
      new Set(
        categoryService
          .getDoctorAppointmentItems()
          .map((item) => String(item.originalId ?? item.id)),
      ),
    [],
  );

  const tabs = React.useMemo<ProfileProductsMainTab[]>(() => {
    const mainOptions = categoryService.getProfileMainOptions();
    return selection.main
      .map(String)
      .map((categoryId) => {
        const category = mainOptions.find((item) => String(item.id) === categoryId);
        if (!category) return null;
        const subIds = (selection.sub[categoryId] ?? [])
          .map(String)
          .filter(
            (subId) =>
              includeDoctorAppointmentItems ||
              categoryId !== String(CATEGORY_CONSTANTS.MEDICAL_SERVICES_ID) ||
              !doctorAppointmentIds.has(subId),
          );
        const subTabs = subIds
          .map((subId): ProfileProductsSubTab | null => {
            const sub = categoryService
              .getProfileSubOptions(category.id, category.isCollection)
              .find((item) => subProductId(item) === subId || String(item.id) === subId);
            if (!sub) return null;
            return {
              id: bucketKey(categoryId, subProductId(sub)),
              categoryId,
              productSubcategoryId: subProductId(sub),
              label: locale === 'ar' ? sub.nameAr : sub.nameEn,
              imageUrl: sub.imageUrl,
              productCount: productsByBucket[bucketKey(categoryId, subProductId(sub))]?.length,
            };
          })
          .filter((item): item is ProfileProductsSubTab => Boolean(item));
        return {
          id: categoryId,
          label: locale === 'ar' ? category.nameAr : category.nameEn,
          imageUrl: category.imageUrl,
          subTabs,
        };
      })
      .filter((item): item is ProfileProductsMainTab => Boolean(item));
  }, [doctorAppointmentIds, includeDoctorAppointmentItems, locale, productsByBucket, selection]);

  React.useEffect(() => {
    if (tabs.length === 0) return;
    const selectedMain = tabs.find((tab) => tab.id === selectedMainId) ?? tabs[0];
    if (selectedMain.id !== selectedMainId) setSelectedMainId(selectedMain.id);
    const selectedSub =
      selectedMain.subTabs.find((tab) => tab.id === selectedSubId) ??
      selectedMain.subTabs[0] ??
      null;
    if (selectedSub && selectedSub.id !== selectedSubId) setSelectedSubId(selectedSub.id);
  }, [selectedMainId, selectedSubId, setSelectedMainId, setSelectedSubId, tabs]);

  const selectedMain = tabs.find((tab) => tab.id === selectedMainId) ?? tabs[0] ?? null;
  const activeSubTab =
    selectedMain?.subTabs.find((tab) => tab.id === selectedSubId) ??
    selectedMain?.subTabs[0] ??
    null;
  const activeBucket = activeSubTab
    ? bucketKey(activeSubTab.categoryId, activeSubTab.productSubcategoryId)
    : '';

  const loadProducts = React.useCallback(
    async (subTab: ProfileProductsSubTab) => {
      if (!uid) return;
      const key = bucketKey(subTab.categoryId, subTab.productSubcategoryId);
      setLoadingBuckets((current) => new Set(current).add(key));
      try {
        const products = await productApiService.listByOwnerAndCategory(
          uid,
          subTab.categoryId,
          subTab.productSubcategoryId,
        );
        setProductsByBucket((current) => ({ ...current, [key]: products }));
      } catch (err) {
        setProductsByBucket((current) => ({ ...current, [key]: [] }));
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoadingBuckets((current) => {
          const next = new Set(current);
          next.delete(key);
          return next;
        });
      }
    },
    [uid],
  );

  React.useEffect(() => {
    if (!activeSubTab || productsByBucket[activeBucket]) return;
    void loadProducts(activeSubTab);
  }, [activeBucket, activeSubTab, loadProducts, productsByBucket]);

  const activeProducts = React.useMemo(() => {
    const raw = productsByBucket[activeBucket] ?? [];
    const search = normalizedFilters.searchText.trim().toLowerCase();
    const filtered = search
      ? raw.filter((product) => productName(product).toLowerCase().includes(search))
      : raw;
    return sortProducts(filtered, normalizedFilters.sortBy);
  }, [activeBucket, normalizedFilters.searchText, normalizedFilters.sortBy, productsByBucket]);

  const selectMain = React.useCallback(
    (mainId: string) => {
      const main = tabs.find((tab) => tab.id === mainId);
      setSelectedMainId(mainId);
      setSelectedSubId(main?.subTabs[0]?.id ?? '');
    },
    [setSelectedMainId, setSelectedSubId, tabs],
  );

  const selectSub = React.useCallback(
    (subId: string) => {
      setSelectedSubId(subId);
    },
    [setSelectedSubId],
  );

  const refetchActiveProducts = React.useCallback(async () => {
    if (activeSubTab) await loadProducts(activeSubTab);
  }, [activeSubTab, loadProducts]);

  const removeProductFromCurrentBucket = React.useCallback(
    (productId: string) => {
      if (!activeBucket) return;
      setProductsByBucket((current) => ({
        ...current,
        [activeBucket]: (current[activeBucket] ?? []).filter(
          (product) => product.id !== productId,
        ),
      }));
    },
    [activeBucket],
  );

  const updateFilters = React.useCallback(
    (next: Partial<ProfileProductsFilters>) => {
      setFilters((current) => ({
        ...normalizeFilters(current),
        ...next,
        extra: { ...normalizeFilters(current).extra, ...(next.extra ?? {}) },
      }));
    },
    [setFilters],
  );

  return {
    tabs,
    selectedMainId: selectedMain?.id ?? '',
    selectedSubId: activeSubTab?.id ?? '',
    activeProducts,
    activeSubTab,
    selection,
    filters: normalizedFilters,
    isLoadingTabs,
    isLoadingProducts: activeBucket ? loadingBuckets.has(activeBucket) : false,
    error,
    selectMain,
    selectSub,
    updateFilters,
    setSelection,
    refetchActiveProducts,
    removeProductFromCurrentBucket,
  };
}
