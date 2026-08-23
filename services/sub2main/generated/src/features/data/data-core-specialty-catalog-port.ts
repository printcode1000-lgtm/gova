import { configureDataCoreRuntimeConfig } from '@asol/data-core/runtime-config';
import { categoryService } from '@/features/categories';
import type {
  DoctorAppointmentItem,
  SpecialtyColumnItem,
} from '@asol/data-core/runtime-config';

/**
 * The specialty-column catalog, registered only where profile rows are read.
 *
 * `data-core`'s profile repositories map a seller's specialties onto column
 * names, and the catalog that defines that mapping comes from
 * `@/features/categories`. Only four accounts carry those repositories:
 * profiles, products, submain and sub2main.
 *
 * It is separate from the runtime-config registration because reaching the
 * category service pulls `@asol/catalog-core` and its schema validation — and
 * `services:sync` refused the notifications mirror over exactly that: an
 * account that never reads a profile row was being handed the catalog, and with
 * it a dependency it does not declare. That refusal is the isolation rule
 * working, so the fix is to grant less, not to declare more.
 */
export function registerDataCoreSpecialtyCatalogPort(): void {
  configureDataCoreRuntimeConfig({
    categoryCatalog: {
      getSpecialtyColumnItems: () =>
        categoryService.getSpecialtyColumnItems() as unknown as readonly SpecialtyColumnItem[],
      getDoctorAppointmentItems: () =>
        categoryService.getDoctorAppointmentItems() as unknown as readonly DoctorAppointmentItem[],
    },
  });
}
