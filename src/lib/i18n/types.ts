/** Supported UI locales. */
export type Locale = 'ar' | 'en';

/** Values interpolated into translation strings, e.g. `{{name}}`. */
export type TranslationParams = Record<string, string | number>;

export type TranslationDictionary = Record<string, string>;
