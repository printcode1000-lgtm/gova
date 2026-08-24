/**
 * Public server door for `@/features/data/server`.
 * Composition packages and server routes register data-core ports here.
 */
export {
  registerDataCoreRuntimeConfigPorts,
  type DataCoreRuntimeConfigPortOptions,
} from './ports/data-core-runtime-config-ports';
export { registerDataCoreSpecialtyCatalogPort } from './ports/data-core-specialty-catalog-port';
export { registerDataCorePorts } from './ports/data-core-ports';
