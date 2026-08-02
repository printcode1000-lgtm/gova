/**
 * Public module map. Server consumers import from `core`; browser consumers
 * import from `browser` so server drivers can never enter client bundles.
 */
export const DATA_ACCESS_MODULE = "data-access" as const;

