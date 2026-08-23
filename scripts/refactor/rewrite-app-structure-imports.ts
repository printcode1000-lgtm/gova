/**
 * One-shot import rewrite after consolidating src/modules, src/lib, src/components,
 * src/hooks, src/shared/theme, and src/shared/locales into src/features and src/shared.
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();

const replacements: Array<[RegExp, string]> = [
  [/@\/lib\/utils\b/g, '@/shared/utils'],
  [/@\/lib\/i18n/g, '@/shared/i18n'],
  [/@\/lib\/preferences/g, '@/shared/preferences'],
  [/@\/lib\/app-init/g, '@/shared/app-init'],
  [/@\/lib\/installation/g, '@/shared/installation'],
  [/@\/lib\/onboarding/g, '@/features/onboarding/domain'],
  [/@\/theme\b/g, '@/shared/theme'],
  [/@\/locales\b/g, '@/shared/locales'],
  [/@\/components\/layouts/g, '@/shared/layouts'],
  [/@\/components\/brand/g, '@/shared/brand'],
  [/@\/components\/onboarding/g, '@/features/onboarding/presentation'],
  [/@\/hooks\/use-guest-session/g, '@/features/auth/application/hooks/use-guest-session'],
  [/@\/hooks\/use-phone-verification/g, '@/features/auth/application/hooks/use-phone-verification'],

  // Feature UI first (before generic components/ui → shared/ui)
  [/@\/components\/ui\/product-card/g, '@/features/product-card/presentation'],
  [/@\/components\/ui\/seller-card/g, '@/features/seller-card/presentation'],
  [/@\/components\/ui\/follow/g, '@/features/follow/presentation'],
  [/@\/components\/ui\/product-search/g, '@/features/product-search/presentation/panel'],
  [/@\/components\/ui\/working-hours/g, '@/features/profile-working-hours/presentation'],
  [/@\/components\/ui\/profile-products-tabs/g, '@/features/profile-products/presentation'],
  [/@\/components\/ui\/HeroSlider/g, '@/features/advertisements/presentation/HeroSlider'],
  [/@\/components\/ui\/FeaturedMarquee/g, '@/features/advertisements/presentation/FeaturedMarquee'],
  [/@\/components\/ui\/TrendingRibbon/g, '@/features/advertisements/presentation/TrendingRibbon'],
  [/@\/components\/ui\/hero-slider/g, '@/features/advertisements/presentation/hero-slider'],
  [/@\/components\/ui\/use-hero-slider/g, '@/features/advertisements/presentation/use-hero-slider'],
  [/@\/components\/ui\/vehicle-specs/g, '@/features/product/presentation/style-editors/vehicle-specs'],
  [/@\/components\/ui\/property-specs/g, '@/features/product/presentation/style-editors/property-specs'],
  [/@\/components\/ui\/main-data/g, '@/features/product/presentation/style-editors/main-data'],
  [/@\/components\/ui\/rating/g, '@/features/product/presentation/style-editors/rating'],
  [/@\/components\/ui\/images\//g, '@/features/product/presentation/style-editors/images/'],
  [/@\/components\/ui\/specifications/g, '@/features/product/presentation/style-editors/specifications'],
  [/@\/components\/ui\/search-columns/g, '@/features/product/presentation/style-editors/search-columns'],
  [/@\/components\/ui\/price\//g, '@/features/product/presentation/style-editors/price/'],
  [/@\/components\/ui\/order\//g, '@/features/product/presentation/style-editors/order/'],
  [/@\/components\/ui\b/g, '@/shared/ui'],

  // Path refs in docs / configs / tests
  [/src\/lib\/utils/g, 'src/shared/utils'],
  [/src\/lib\/i18n/g, 'src/shared/i18n'],
  [/src\/lib\/preferences/g, 'src/shared/preferences'],
  [/src\/lib\/app-init/g, 'src/shared/app-init'],
  [/src\/lib\/installation/g, 'src/shared/installation'],
  [/src\/lib\/onboarding/g, 'src/features/onboarding/domain'],
  [/src\/theme\b/g, 'src/shared/theme'],
  [/src\/locales\b/g, 'src/shared/locales'],
  [/src\/components\/layouts/g, 'src/shared/layouts'],
  [/src\/components\/brand/g, 'src/shared/brand'],
  [/src\/components\/ui\/product-card/g, 'src/features/product-card/presentation'],
  [/src\/components\/ui\/seller-card/g, 'src/features/seller-card/presentation'],
  [/src\/components\/ui\/follow/g, 'src/features/follow/presentation'],
  [/src\/components\/ui\/product-search/g, 'src/features/product-search/presentation/panel'],
  [/src\/components\/ui\/working-hours/g, 'src/features/profile-working-hours/presentation'],
  [/src\/components\/ui\/profile-products-tabs/g, 'src/features/profile-products/presentation'],
  [/src\/components\/ui/g, 'src/shared/ui'],
  [/src\/components\/onboarding/g, 'src/features/onboarding/presentation'],
  [/src\/hooks\/use-guest-session/g, 'src/features/auth/application/hooks/use-guest-session'],
  [/src\/hooks\/use-phone-verification/g, 'src/features/auth/application/hooks/use-phone-verification'],
];

const SKIP = new Set([
  'node_modules',
  '.git',
  '.next',
  'out',
  'android',
  'ios',
  'coverage',
  'dist',
  '.deploy-all',
  '.backups',
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|js|mjs|cjs|json|md|css)$/.test(e.name)) out.push(full);
  }
  return out;
}

let changed = 0;
for (const file of walk(ROOT)) {
  const text = readFileSync(file, 'utf8');
  let next = text;
  for (const [re, to] of replacements) next = next.replace(re, to);
  if (next !== text) {
    writeFileSync(file, next);
    changed += 1;
  }
}

console.log(`Updated ${changed} files`);
