'use client';

import { ChevronLeft, Store } from 'lucide-react';
import Image from 'next/image';

import { useTranslation } from '@/lib/i18n';
import type { TranslationKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { shouldUseUnoptimizedImage } from '@/lib/images/external-image';

const CATEGORY_RINGS = ['gova-ring-primary', 'gova-ring-secondary', 'gova-ring-tertiary', 'gova-ring-error'] as const;

const CATEGORIES = [
  {
    id: 'fashion',
    nameKey: 'category.fashion',
    imgSrc:
      'https://lh3.googleusercontent.com/aida/AP1WRLsgtZzPqQF8qj-DiQKYE86EIBmmBRZVztf31LByeblQApGZWD0d0iZ-WrT_3lk2gq8C9N6xiQdiNdrBgsMQE_qW7E1nGexODZ6BSeUxSG4A1aJ-4BLugFMUAVz7lCZH8wi1Bc97971NcLRlibUz260qfQ3OoTahX3ryfKxADALFIl-oObPHtIUurVVkJJAvqBtFg9ujC4H8rb4Qy3_keUw4-tWPqMrH6ORY82V-XvhbFHh3nxW8qWvi3A',
  },
  {
    id: 'automotive',
    nameKey: 'category.automotive',
    imgSrc:
      'https://lh3.googleusercontent.com/aida/AP1WRLt_QHASCj4dB-in6ocCQPcsnkfqnXhgSkTHLrfkwEZ33SrbxRoGVFeOmtEmq2uIslL3RrBByikT8aPjiy8x8rhI0XIYnpCrKQbA9Upe3kPoW2kC104BgfLq0U_whn99XvEGu0DZhXanXxOJwgXiv2Xqi7cSchl4AfHkJUd9_3kCF3cQAo6OTZdlutFVSOFSuZLMnWivrifQoJR7Kq2Xhcs-g_MGn3Ixg2OHQytdiW6r0vxHVMMDs791oQ',
  },
  {
    id: 'realestate',
    nameKey: 'category.realestate',
    imgSrc:
      'https://lh3.googleusercontent.com/aida/AP1WRLviJKEzNj5O3szQyiiMOFYN5bTLlY84ez7aSiImrwY0HivS7FHIEANp1nr_fgrtJHR6LTMcoGuQ3qowcAiMbyjDhdY2Po6aa6wNqdkxrUVTWJ_xEvzc4qdfjrurOQStMajPl3obgSHeX5JUPma_43KfT_1q54qVCQlm9evFkrPeEJBNImF7Xd2xe355-hgysUpJDstGX_4pzskHwJXSd0TAQvK1H1LX-aQepVahM1SoEfG06yECjnoEIg',
  },
  {
    id: 'medical',
    nameKey: 'category.medical',
    imgSrc:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDeGdzeUkW8JQecWz-M2fqfhozSTiIdxZqjKdim7MjQiEMyala2DBZ76WYV_BnhAwdglxkstKQBdZW4TV3I5qtkbDYC5_ReU4DvlBeq5zdL2orQ4nd_HrP7oxDpUsWrFmAWMMiuIxynKfEzcXyQBN2Xw9P--hl5Xk7TVTYKY0BxSqkHYg7A50chXWVVzu355P4CUTDF_OaeRU6j24oev1hQ_uF59ZF8QGHnAeI5tN8Kt5t8d4KKjC_s82TWkT4lEkfKoJTd8Nnm9g',
  },
  {
    id: 'pharmacy',
    nameKey: 'category.pharmacy',
    imgSrc:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBwR_P7enT0h2VqWj6l-V8_vxJHuPQxZxOIoPfgnE9vwBTfeP1eT8Fi0xt8vQ7KtxHtjYek4zO5ErSA_Rq3GTnMrGwE0V25RZpXpKqQcI9a19_MO0uz0bVF_b04WXiy9oS_-5tZT9SjM5SGXp81RkCy6sIY0B5q659xqkgDbrTFiZcwmz0GxHGLHcBDFLVxhwK5dN1ivPCBTmQUZr_HGIE2w1knK9qE2W0JFT-Z7xHKrRxPZDO_T6NRYoGxQ9ZvTqI_pvAEfPsUug',
  },
  {
    id: 'education',
    nameKey: 'category.education',
    imgSrc:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAXcxTngdeDHTcnk7mMopO-xWV3IvOcAfFG0Py2XhJ7AYRia7zyigcenoBKEihcZgDXkb9S3U8s_zeFWxLopaojs5YWIynYhj7gyngsEZiJPTFiOw3MJH6btokE-xAaZ41MNsN1RUFBlBj8fWkZU12cos-zBWpZ9HhYjE27hu5veBnmKRmiYNiZFUkBz_r6tF1nDslLSSd2Wk_zyK9la2XGTIMsXEvTjUUVEYJGtrhIM00gOkbjSMjo-cKR45KtrcP1zQzH1uvz6A',
  },
  {
    id: 'electronics',
    nameKey: 'category.electronics',
    imgSrc:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuA0BFZ0-S-dKVPkpzRHj3TuiHQrYuRMPkGJwuwzfeDCNeMz_oBdqfyCnJLvOuMoXEVWAh33KNPkr_bMuXwUAbJe2MOW0PiWDsJeHb7HMBPiDdXl00CK8rj9Lbm5WJ5B2HXa6RNy3vWH1pqOOZ5GFD0jH84gTiX6xC_GMmGGM1jF8kBN5JevNe2MSWqJJrH0VMa0tpnV-C29WqHSPWaUV9FqtYQqCJi-RN8S0Sk-UWzYNMc6ooA-NibA',
  },
  {
    id: 'food',
    nameKey: 'category.food',
    imgSrc:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBhpg5GJiVVqfF-I9B4FNXEsEj4s4WflK4Wk8_Y3cbD7O9ZdWmYqnnuFD11ZLAkLLUzh8sMi00jGW-h66M4UNacPMWCFI_hq-5MBkPpnK1FQGFhXpUK5-jFkl0Q8OuODTiimh2kFMFYJuFJzX_ixPh4cbUSrfBRNK10PUFj0e1Rf-fCUvtQ5ykNSk_0sO-8_SXhKEopqeXQ2NR0K7u3OGv4rqVPPRDEuDhGW4Zyh1sJcRQX7F3kG7Q',
  },
] as const satisfies ReadonlyArray<{ id: string; nameKey: TranslationKey; imgSrc: string }>;

export function CategoriesGrid() {
  const { t, isRTL } = useTranslation();

  return (
    <section>
      <div className="flex justify-between items-end mb-4">
        <h3 className="gova-section-heading gova-section-heading-primary">
          <Store className="w-5 h-5 text-primary" aria-hidden />
          {t('home.suezMarkets')}
        </h3>
        <button
          type="button"
          className="flex items-center gap-1 px-4 py-1.5 rounded-full text-xs font-semibold transition-colors gova-surface-neutral active:opacity-80 text-on-surface-variant"
        >
          <span>{t('home.toggleTheme')}</span>
          <ChevronLeft className={cn('w-4 h-4', !isRTL && 'rotate-180')} />
        </button>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4 sm:gap-6 pb-2">
        {CATEGORIES.map((cat, index) => {
          const name = t(cat.nameKey);
          return (
            <button
              key={cat.id}
              type="button"
              className="flex flex-col items-center gap-2 group"
              aria-label={name}
            >
              <div
                className={cn(
                  'rounded-full overflow-hidden border-2 border-transparent p-1 transition-all w-full aspect-square relative',
                  CATEGORY_RINGS[index % CATEGORY_RINGS.length],
                  'group-active:border-primary',
                )}
              >
                <div className="relative w-full h-full rounded-full overflow-hidden bg-surface-bright">
                  <Image
                    src={cat.imgSrc}
                    alt={name}
                    fill
                    className="object-cover"
                    unoptimized={shouldUseUnoptimizedImage(cat.imgSrc)}
                  />
                </div>
              </div>
              <span className="text-center text-xs font-semibold leading-4 text-on-surface-variant">
                {name}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
