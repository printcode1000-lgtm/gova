'use client';

export { useProfileProductsTabs } from './presentation/hooks/use-profile-products-tabs';
export { registerProfileSpecialtiesPort } from './ports/profile-specialties.port';
export type {
  ProfileProductsFilters,
  ProfileProductsMainTab,
  ProfileProductsSubTab,
  ProfileProductsTabsMode,
  ProfileProductsTabsState,
  UseProfileProductsTabsInput,
} from './domain/profile-products.types';
