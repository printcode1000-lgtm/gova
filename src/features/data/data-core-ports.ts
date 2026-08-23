import { configureDataCoreProductSearchFields } from '@asol/data-core/product-search-fields';
import {
  getDefaultProductSearchFieldKeys,
  getProductSearchFieldByKey,
  getProductSearchFields,
} from '@/features/product-search';
import { registerDataCoreRuntimeConfigPorts } from './data-core-runtime-config-ports';
import { registerDataCoreSpecialtyCatalogPort } from './data-core-specialty-catalog-port';

/**
 * Everything `@asol/data-core` needs in the main application.
 *
 * The runtime config is shared with the isolated accounts and lives in its own
 * module; product-search field metadata is registered only where search runs.
 */
export function registerDataCorePorts(): void {
  registerDataCoreRuntimeConfigPorts();
  registerDataCoreSpecialtyCatalogPort();
  configureDataCoreProductSearchFields({
    getProductSearchFields,
    getProductSearchFieldByKey,
    getDefaultProductSearchFieldKeys,
  });
}
