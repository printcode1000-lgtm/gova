import { configureDataCoreRuntimeConfig } from '@asol/data-core/runtime-config';
import { configureDataCoreProductSearchFields } from '@asol/data-core/product-search-fields';
import { asolHttpFetch } from '@/core/api/asol-http-transport';
import { isDevelopment } from '@/core/config';
import {
  getServerRuntimeContext,
  isDevRuntime,
  isProvisioningContext,
} from '@/core/config/runtime-context.server';
import {
  getTursoAdvertisementsRuntimeCredentials,
  getTursoNotificationsRuntimeCredentials,
  getTursoPlatformCredentials,
  getTursoProductRuntimeCredentials,
  getTursoRuntimeCredentials,
  listLibsqlDatabaseUrlKeys,
  readOptionalEnv,
  writeTursoAdvertisementsRuntimeCredentials,
  writeTursoProductRuntimeCredentials,
  writeTursoRuntimeCredentials,
} from '@/core/config/server-env.values';
import { categoryService } from '@/features/categories';
import {
  getDefaultProductSearchFieldKeys,
  getProductSearchFieldByKey,
  getProductSearchFields,
} from '@/features/product-search/config/product-search-fields';
import type {
  DoctorAppointmentItem,
  SpecialtyColumnItem,
} from '@asol/data-core/runtime-config';

/** Registers runtime config into `@asol/data-core` (server). */
export function registerDataCorePorts(): void {
  configureDataCoreRuntimeConfig({
    isDevelopment,
    isDevRuntime,
    isProvisioningContext,
    getServerRuntimeContext: () => getServerRuntimeContext(),
    getTursoRuntimeCredentials,
    getTursoProductRuntimeCredentials,
    getTursoNotificationsRuntimeCredentials,
    getTursoAdvertisementsRuntimeCredentials,
    getTursoPlatformCredentials,
    writeTursoRuntimeCredentials,
    writeTursoProductRuntimeCredentials,
    writeTursoAdvertisementsRuntimeCredentials,
    readOptionalEnv,
    listLibsqlDatabaseUrlKeys,
    asolHttpFetch,
    categoryCatalog: {
      getSpecialtyColumnItems: () =>
        categoryService.getSpecialtyColumnItems() as unknown as readonly SpecialtyColumnItem[],
      getDoctorAppointmentItems: () =>
        categoryService.getDoctorAppointmentItems() as unknown as readonly DoctorAppointmentItem[],
    },
  });
  configureDataCoreProductSearchFields({
    getProductSearchFields,
    getProductSearchFieldByKey,
    getDefaultProductSearchFieldKeys,
  });
}
