'use client';

import type { ProductRecord } from '@/features/product/entities/product.entity';
import type { ProfileSpecialtiesSelection } from '@/features/profile/entities/profile-specialties.entity';

export type ProfileProductsTabsMode = 'edit' | 'preview';

export interface ProfileProductsSubTab {
  id: string;
  categoryId: string;
  productSubcategoryId: string;
  label: string;
  imageUrl: string;
  productCount?: number;
}

export interface ProfileProductsMainTab {
  id: string;
  label: string;
  imageUrl: string;
  subTabs: ProfileProductsSubTab[];
}

export interface ProfileProductsFilters {
  searchText: string;
  sortBy: 'newest' | 'oldest' | 'name';
  extra: Record<string, unknown>;
}

export interface ProfileProductsTabsState {
  tabs: ProfileProductsMainTab[];
  selectedMainId: string;
  selectedSubId: string;
  activeProducts: ProductRecord[];
  activeSubTab: ProfileProductsSubTab | null;
  selection: ProfileSpecialtiesSelection;
  filters: ProfileProductsFilters;
  isLoadingTabs: boolean;
  isLoadingProducts: boolean;
  error: string | null;
}

export interface UseProfileProductsTabsInput {
  uid: string;
  mode: ProfileProductsTabsMode;
  enabled?: boolean;
  snapshotKeyPrefix?: string;
  includeDoctorAppointmentItems?: boolean;
}
