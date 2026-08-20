import { asolApi } from "@/core/api";
import {
  catalogManifestSchema,
  visibleCatalogItems,
  vehicleGroupCatalogFileSchema,
  vehicleOptionCatalogFileSchema,
} from '@asol/catalog-core';
import type { VehicleCatalog } from "../entities/vehicle-catalog.types";

const publicCatalogUrl = (relativePath: string) => `/catagory/${relativePath.replace(/^\/+/, "")}`;

export class VehicleCatalogService {
  private cachedCatalog: Promise<VehicleCatalog> | null = null;

  load(): Promise<VehicleCatalog> {
    if (!this.cachedCatalog) this.cachedCatalog = this.loadUncached();
    return this.cachedCatalog;
  }

  invalidate(): void {
    this.cachedCatalog = null;
  }

  private async loadUncached(): Promise<VehicleCatalog> {
    const manifest = catalogManifestSchema.parse(
      await asolApi.getPublicJson<unknown>("/catagory/manifest.json"),
    );
    const groupFile = vehicleGroupCatalogFileSchema.parse(
      await asolApi.getPublicJson<unknown>(
        publicCatalogUrl(manifest.datasets.vehicles.groups),
      ),
    );
    const groups = visibleCatalogItems(groupFile.items, (group) => group.key);
    const entries = await Promise.all(
      groups.map(async (group) => {
        const optionFile = vehicleOptionCatalogFileSchema.parse(
          await asolApi.getPublicJson<unknown>(publicCatalogUrl(group.optionFile)),
        );
        return [
          group.key,
          Object.freeze(visibleCatalogItems(optionFile.items, (option) => option.id)),
        ] as const;
      }),
    );
    return Object.freeze({
      groups: Object.freeze(groups),
      optionsByGroup: Object.freeze(Object.fromEntries(entries)),
      imageRoot: manifest.assets.vehicles,
    });
  }
}

export const vehicleCatalogService = new VehicleCatalogService();
