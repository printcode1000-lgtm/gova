export type { Locale, TranslationParams, TranslationDictionary } from './types';
export type { TranslationKey } from './dictionaries';
export { dictionaries } from './dictionaries';
export { SUPPORTED_LOCALES, DEFAULT_LOCALE, isRtlLocale } from './constants';
export { translate, interpolate } from './translate';
export { applyDocumentLocale, LOCALE_CHANGED_EVENT } from './apply-locale';
export { useTranslation } from './use-translation';
export { useAdminArabic } from './use-admin-arabic';
export { translateAdminArabic } from './admin-ar';
export {
  ARABIC_ONLY_SOURCE_ROOTS,
  isArabicOnlyRoute,
} from './arabic-only-routes';
