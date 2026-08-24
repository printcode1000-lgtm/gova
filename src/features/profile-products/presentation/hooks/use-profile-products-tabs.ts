"use client";

import * as React from "react";
import { useSnapshotState } from "@/features/page-snapshot";
import { categoryService } from "@/features/categories";
import { productApiService } from "@/features/product/ui";
import type { ProductRecord } from "@/features/product";
import {
  EMPTY_PROFILE_SPECIALTIES,
  type ProfileSpecialtiesSelection,
} from "@/features/profile";
import { profileService } from "@/features/profile/ui";
import { useTranslation } from "@/shared/i18n";
import type {
  ProfileProductsFilters,
  ProfileProductsMainTab,
  ProfileProductsSubTab,
  UseProfileProductsTabsInput,
} from "../../domain/profile-products.types";
import {
  EMPTY_PROFILE_PRODUCTS_FILTERS,
  buildProfileProductsTabs,
  filterActiveProfileProducts,
  normalizeProfileProductsFilters,
  normalizeProfileProductsSelection,
  profileProductsBucketKey,
} from "./profile-products-tabs-model";

export function useProfileProductsTabs({
  uid,
  mode,
  enabled = true,
  snapshotKeyPrefix = "profile-products",
  includeDoctorAppointmentItems = false,
}: UseProfileProductsTabsInput) {
  const { locale } = useTranslation();
  const [selection, setSelection] = React.useState<ProfileSpecialtiesSelection>(
    EMPTY_PROFILE_SPECIALTIES,
  );
  const [isLoadingTabs, setIsLoadingTabs] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [productsByBucket, setProductsByBucket] = React.useState<
    Record<string, ProductRecord[]>
  >({});
  const [loadingBuckets, setLoadingBuckets] = React.useState<Set<string>>(
    new Set(),
  );
  const [selectedMainId, setSelectedMainId] = useSnapshotState(
    `${snapshotKeyPrefix}.${mode}.main`,
    "",
  );
  const [selectedSubId, setSelectedSubId] = useSnapshotState(
    `${snapshotKeyPrefix}.${mode}.sub`,
    "",
  );
  const [filters, setFilters] = useSnapshotState<ProfileProductsFilters>(
    `${snapshotKeyPrefix}.${mode}.filters`,
    EMPTY_PROFILE_PRODUCTS_FILTERS,
  );
  const normalizedFilters = React.useMemo(
    () => normalizeProfileProductsFilters(filters),
    [filters],
  );

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
          setSelection(normalizeProfileProductsSelection(next));
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
    return buildProfileProductsTabs({
      doctorAppointmentIds,
      includeDoctorAppointmentItems,
      locale,
      productsByBucket,
      selection,
    });
  }, [
    doctorAppointmentIds,
    includeDoctorAppointmentItems,
    locale,
    productsByBucket,
    selection,
  ]);

  React.useEffect(() => {
    if (isLoadingTabs) return;
    if (tabs.length === 0) {
      if (selectedMainId) setSelectedMainId("");
      if (selectedSubId) setSelectedSubId("");
      return;
    }
    const selectedMain =
      tabs.find((tab) => tab.id === selectedMainId) ?? tabs[0];
    if (selectedMain.id !== selectedMainId) setSelectedMainId(selectedMain.id);
    const selectedSub =
      selectedMain.subTabs.find((tab) => tab.id === selectedSubId) ??
      selectedMain.subTabs[0] ??
      null;
    const nextSubId = selectedSub?.id ?? "";
    if (nextSubId !== selectedSubId) setSelectedSubId(nextSubId);
  }, [
    isLoadingTabs,
    selectedMainId,
    selectedSubId,
    setSelectedMainId,
    setSelectedSubId,
    tabs,
  ]);

  const selectedMain =
    tabs.find((tab) => tab.id === selectedMainId) ?? tabs[0] ?? null;
  const activeSubTab =
    selectedMain?.subTabs.find((tab) => tab.id === selectedSubId) ??
    selectedMain?.subTabs[0] ??
    null;
  const activeBucket = activeSubTab
    ? profileProductsBucketKey(activeSubTab.categoryId, activeSubTab.productSubcategoryId)
    : "";

  const loadProducts = React.useCallback(
    async (subTab: ProfileProductsSubTab) => {
      if (!uid) return;
      const key = profileProductsBucketKey(subTab.categoryId, subTab.productSubcategoryId);
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
    return filterActiveProfileProducts({
      activeBucket,
      mode,
      normalizedFilters,
      productsByBucket,
    });
  }, [
    activeBucket,
    mode,
    normalizedFilters.searchText,
    normalizedFilters.sortBy,
    productsByBucket,
  ]);

  const selectMain = React.useCallback(
    (mainId: string) => {
      const main = tabs.find((tab) => tab.id === mainId);
      setSelectedMainId(mainId);
      setSelectedSubId(main?.subTabs[0]?.id ?? "");
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
        ...normalizeProfileProductsFilters(current),
        ...next,
        extra: { ...normalizeProfileProductsFilters(current).extra, ...(next.extra ?? {}) },
      }));
    },
    [setFilters],
  );

  return {
    tabs,
    selectedMainId: selectedMain?.id ?? "",
    selectedSubId: activeSubTab?.id ?? "",
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

