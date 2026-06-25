'use client';

import { Heart, ShoppingCart, Tag } from 'lucide-react';
import Image from 'next/image';

import { useTranslation } from '@/lib/i18n';
import type { TranslationKey } from '@/lib/i18n';
import { shouldUseUnoptimizedImage } from '@/lib/images/external-image';

const PRODUCTS = [
  {
    id: 'product-card-shoes',
    categoryKey: 'category.fashion',
    titleKey: 'product.proRunnerShoes',
    priceKey: 'product.price.runnerShoes',
    favFilled: true,
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBrrlu99AXxpnySoT0CXYw9jmKXJlE8qHqsMW1lJVDxmYSToTATqZXQvuXCOhwTya7swIst2AXOqUCCMfgK_qFI4pxUxDFj4qM_S5hznXyZU8MdEBJKZC1edrKvH_yyEIgLclSkn5PiAqJMWRWKC4VXMJtSkmsoKp9M1Jo9B8Jsv5CS9lZyYodd0ot0N1F_0l4GqESjaQQsBVYw7I1gfb3prR6qC3fk7-rdhL3SBDvmvwsoEAXx4DvTfiphjTbv1R0GZ3AxnAkyAA',
  },
  {
    id: 'product-card-medical',
    categoryKey: 'category.medicalShort',
    titleKey: 'product.scannerV4',
    priceKey: 'product.price.scanner',
    favFilled: false,
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCo-uZJ3G_TOs_xEN_x7AFlRAbn748BtDQ7B7NZnFvlElLXyePimeSnmYAAwF_3V67GbgKV9ntlPetPaYWBRckRohk6On9zpwjFognTvPkW4nvfqf5JJ21annvYIF8XhzOPL8k53g0TMHFLcF3SzPj_iku_i-YDhmckPDJfUbXHXGggvojKKEBviDpry1_A_CmRSEdQ5i6EBztnfSS8Th7BKO_R-2LsEy3zqVH1RkOhGNpV8VmSJ4a70HK2KBwoVm88T4ye_HnT-Q',
  },
  {
    id: 'product-card-phone',
    categoryKey: 'category.electronics',
    titleKey: 'product.novaPhone',
    priceKey: 'product.price.novaPhone',
    favFilled: false,
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA3TBP9OU-QGRFRmOtRCgH3QdTHznS6H8wly6vvsdal9hOWO_JehYnsOoF9F7GdKsCGBDs-CbucOw22KgU0MDec0DFz5I9nQ9nJi5immslfnhvvEfgAPtMmd2XeD4HN-HCkFN3v0T6S1gclHHFsLVTBhTByDjTByLEkqylRaiscsUJJNBU8b_Gmb-E2Mv1p5vg0lIIaMoUTXzB8NQQZq2Nybrb8_OFQqTvS-ZePZEI4mMOFjVpwY_eXoxcsv3WG8U8jEd8ZyNxYpw',
  },
  {
    id: 'product-card-watch',
    categoryKey: 'category.accessories',
    titleKey: 'product.timepieceWatch',
    priceKey: 'product.price.timepieceWatch',
    favFilled: false,
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDgB3Ru4a-PuZX04N9ND714YTfyjcUMEcPmb5FW2tXf_RHEV2CZtWP0M0mvHAFx6xReMqaCD3lJh9OVbHQQAm2s2s6yDah_mVqwOMh5IEtUtUCAVsZY1jL-yw5Bh6lUooj3dHkPlzsq-OAUPDsttgGALzSPbAm1v55CvVUhZcbiSUhlftmaGQr6bgoYFsFCfJD_hJRwlyrfOWbCBrb_R6piuurxECLkm5I5j1auBdh7QMam-E-fxZKvahaFZv1g_COu0OCBpSuzqg',
  },
] as const satisfies ReadonlyArray<{
  id: string;
  categoryKey: TranslationKey;
  titleKey: TranslationKey;
  priceKey: TranslationKey;
  favFilled: boolean;
  img: string;
}>;

export function CuratedOffers() {
  const { t } = useTranslation();

  return (
    <section className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Tag size={24} className="text-secondary" aria-hidden />
          <h3 className="gova-section-heading gova-section-heading-secondary">{t('home.curated.title')}</h3>
        </div>
        <span className="gova-accent-chip-tertiary">{t('home.curated.limited')}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
        {PRODUCTS.map((product) => {
          const title = t(product.titleKey);
          return (
            <article
              key={product.id}
              className="gova-card-tonal gova-card-tonal-secondary overflow-hidden transition-all active:scale-95"
            >
              <div className="relative aspect-square">
                <Image
                  src={product.img}
                  alt={title}
                  fill
                  className="object-cover transition-transform active:scale-110"
                  unoptimized={shouldUseUnoptimizedImage(product.img)}
                />
                <button
                  type="button"
                  className="absolute top-2 start-2 w-8 h-8 rounded-full gova-surface-neutral/90 backdrop-blur flex items-center justify-center shadow-sm transition-transform active:scale-90"
                  style={{ color: product.favFilled ? 'var(--error)' : 'var(--on-surface-variant)' }}
                  aria-label={t('home.curated.addToFavorites')}
                >
                  <Heart size={18} fill={product.favFilled ? 'currentColor' : 'none'} />
                </button>
              </div>

              <div className="p-3 space-y-1">
                <span className="text-xs font-semibold text-success">{t(product.categoryKey)}</span>
                <span className="block text-sm font-bold truncate text-on-surface">{title}</span>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-base font-bold text-primary">{t(product.priceKey)}</span>
                  <button
                    type="button"
                    className="w-8 h-8 rounded-lg flex items-center justify-center gova-accent-cta transition-transform active:scale-90"
                    aria-label={t('home.curated.addToCart')}
                  >
                    <ShoppingCart size={18} />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="flex justify-center pt-2">
        <button
          type="button"
          className="gova-control px-6 rounded-full font-bold text-sm gova-surface-neutral text-primary transition-transform active:scale-95"
        >
          {t('home.curated.showMore')}
        </button>
      </div>
    </section>
  );
}
