import type {
  VehicleCatalogGroup,
  VehicleCatalogOption,
} from '@asol/catalog-core';

export interface VehicleCatalog {
  groups: readonly VehicleCatalogGroup[];
  optionsByGroup: Readonly<Record<string, readonly VehicleCatalogOption[]>>;
  imageRoot: string;
}

export type { VehicleCatalogGroup, VehicleCatalogOption };
