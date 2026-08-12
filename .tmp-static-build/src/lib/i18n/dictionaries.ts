import ar from '@/locales/ar.json';
import en from '@/locales/en.json';

import type { Locale, TranslationDictionary } from './types';

export const dictionaries: Record<Locale, TranslationDictionary> = { ar, en };

/** All keys defined in the Arabic dictionary (source of truth). */
export type TranslationKey = keyof typeof ar;
