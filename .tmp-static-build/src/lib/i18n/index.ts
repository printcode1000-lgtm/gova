export type { Locale, TranslationParams, TranslationDictionary } from './types';
export type { TranslationKey } from './dictionaries';
export { dictionaries } from './dictionaries';
export { SUPPORTED_LOCALES, DEFAULT_LOCALE, isRtlLocale } from './constants';
export { translate, interpolate } from './translate';
export { applyDocumentLocale } from './apply-locale';
export { useTranslation } from './use-translation';
