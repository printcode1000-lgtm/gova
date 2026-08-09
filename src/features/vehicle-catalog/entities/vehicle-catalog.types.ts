import type {
  VehicleCatalogGroup,
  VehicleCatalogOption,
} from "@/features/catalog-data/types/catalog-v3.types";

export interface VehicleCatalog {
  groups: readonly VehicleCatalogGroup[];
  optionsByGroup: Readonly<Record<string, readonly VehicleCatalogOption[]>>;
  imageRoot: string;
}

export type { VehicleCatalogGroup, VehicleCatalogOption };
