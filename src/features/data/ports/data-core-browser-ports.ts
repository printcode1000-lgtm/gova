'use client';

import {
  configureDataCoreRuntimeConfig,
  type DoctorAppointmentItem,
  type SpecialtyColumnItem,
} from '@asol/data-core/runtime-config';
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
        categoryService.getSpecialtyColumnItems() as unknown as readonly SpecialtyColumnItem[],
      getDoctorAppointmentItems: () =>
        categoryService.getDoctorAppointmentItems() as unknown as readonly DoctorAppointmentItem[],
    },
  });
}
