const ARABIC_ONLY_ROUTE_PREFIXES = ["/super-admin", "/dev"] as const;

/** Routes that are always Arabic and exempt from the public i18n dictionaries. */
export function isArabicOnlyRoute(pathname: string): boolean {
  return ARABIC_ONLY_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export const ARABIC_ONLY_SOURCE_ROOTS = [
  "src/app/super-admin",
  "src/app/dev",
  "src/components/super-admin",
  "src/modules/google-play-console",
  "src/modules/data-health",
  "src/modules/dev-cloud-backup",
  "src/modules/deploy-console",
  "src/features/catalog-studio",
  "src/components/dev/DeveloperCategorySelector.tsx",
  "src/components/dev/DeveloperBadge.tsx",
  "src/core/monitor",
] as const;
