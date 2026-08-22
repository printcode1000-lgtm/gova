'use client';

import { configureDataCoreRuntimeConfig } from '@asol/data-core/runtime-config';
import { isDevelopment } from '@/core/config';
import { categoryService } from '@/features/categories';

/**
 * Browser half of `@asol/data-core` runtime config.
 * Specialty-column maps are built from the category catalog on the client too.
 */
export function registerDataCoreBrowserPorts(): void {
  configureDataCoreRuntimeConfig({
    isDevelopment,
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
