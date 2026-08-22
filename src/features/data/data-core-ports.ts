import 'server-only';

import { configureDataCoreRuntimeConfig } from '@asol/data-core/runtime-config';
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
        categoryService.getSpecialtyColumnItems() as ReturnType<
          typeof categoryService.getSpecialtyColumnItems
        >,
      getDoctorAppointmentItems: () =>
        categoryService.getDoctorAppointmentItems() as ReturnType<
          typeof categoryService.getDoctorAppointmentItems
        >,
    },
  });
}
