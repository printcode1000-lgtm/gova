'use client';

import { Sparkles } from 'lucide-react';
import Image from 'next/image';

import { useTranslation } from '@/lib/i18n';
import type { TranslationKey } from '@/lib/i18n';
import { shouldUseUnoptimizedImage } from '@/lib/images/external-image';

const FEATURED = [
  {
    id: 'f1',
    titleKey: 'product.novaPhone',
    priceKey: 'product.price.novaPhone',
    imgSrc:
      'https://lh3.googleusercontent.com/aida/AP1WRLtEUw6-qlL4o6Qccuslz1ZFGyo83z47nMN7FSEUDCYEw7AmquNAI3tN3jdpOMpDsahuSh4II8mz0ZnUIegHIHyRkB7kcJt1_GZ5q7NxVHab9PlnvnbrC0HmMGwXcGNLsd-mdIcumjQK-ll095WLGyg2Bbgaj5xGVewZsvspEwrQ8K8C_hDg-3vjVh_luRgh55lpnUtP27RbO7Ot7bGWqQkJj5ZzWL2PA9F7s2rfdBrw-Gw7uq23XYKJ5w',
  },
  {
    id: 'f2',
    titleKey: 'product.eliteRealEstate',
    priceKey: 'product.price.eliteRealEstate',
    imgSrc:
      'https://lh3.googleusercontent.com/aida/AP1WRLviJKEzNj5O3szQyiiMOFYN5bTLlY84ez7aSiImrwY0HivS7FHIEANp1nr_fgrtJHR6LTMcoGuQ3qowcAiMbyjDhdY2Po6aa6wNqdkxrUVTWJ_xEvzc4qdfjrurOQStMajPl3obgSHeX5JUPma_43KfT_1q54qVCQlm9evFkrPeEJBNImF7Xd2xe355-hgysUpJDstGX_4pzskHwJXSd0TAQvK1H1LX-aQepVahM1SoEfG06yECjnoEIg',
  },
  {
    id: 'f3',
    titleKey: 'product.proRunnerShoes',
    priceKey: 'product.price.runnerShoes',
    imgSrc:
      'https://lh3.googleusercontent.com/aida/AP1WRLsd8xKnUFaAmAC-62H9fY8gRyJqkMK95ilrnZkBvmtXgQ7RnCn02VTTSb1ASmlXIEwxKY1HlYYc-5OqK30TlrnJZeJ4_G7PvX1y0-ie6TuP-VXKZpJkQok7g3s3uGq9eNkxDBDWRxOyATAa9Eal7864mbBmTpCamL0gvgu7t76o3sYzVreHzLSm3RiGesXWjcR-3JhYX3psmBViPfSSKdzcoZJIl3wN_3yCzX36jnorjpQnJatK45FOPw',
  },
  {
    id: 'f4',
    titleKey: 'product.luxuryWatch',
    priceKey: 'product.price.luxuryWatch',
    imgSrc:
      'https://lh3.googleusercontent.com/aida/AP1WRLsNCuOTl0bHIbRzayCP1i2NV97MpEzhv6-X7487scdHc8UY8Zhl1tVj3KJiagW7sKcOq3SP4sK0ffvkVeQgmBZWhpHCeFxfgLDp6ESd8eIfwjy_4iCebVdAl-FK9RUW_MszRt6dBXWnv_2Ee8tjJwD6eBa8D_5y7fncl3Tu1_TwE9zmulVgVZ0UQpiVDHQ04-HfidO3MkmojC-9i_EiO6wLB9egGPgIvsed0K742sfupasCadR_Fbq8',
  },
] as const satisfies ReadonlyArray<{
  id: string;
  titleKey: TranslationKey;
  priceKey: TranslationKey;
  imgSrc: string;
}>;

export function FeaturedMarquee() {
  const { t } = useTranslation();
  const items = [...FEATURED, ...FEATURED];

  return (
    <section className="space-y-3 overflow-hidden">
      <div className="flex justify-between items-center">
        <h3 className="gova-section-heading gova-section-heading-tertiary">
          <Sparkles className="w-5 h-5 text-tertiary animate-pulse-subtle" aria-hidden />
          {t('home.featured.title')}
        </h3>
      </div>

      <div className="relative overflow-hidden py-4 rounded-xl gova-surface-neutral" dir="ltr">
        <div className="home-marquee-cards-track gap-4 pr-4">
          {items.map((item, idx) => {
            const title = t(item.titleKey);
            return (
              <div
                key={`${item.id}-${idx}`}
                className="shrink-0 w-40 rounded-xl p-2 gova-card-tonal gova-card-tonal-tertiary"
              >
                <Image
                  src={item.imgSrc}
                  alt={title}
                  width={160}
                  height={160}
                  className="w-full aspect-square object-cover rounded-lg mb-2"
                  unoptimized={shouldUseUnoptimizedImage(item.imgSrc)}
                />
                <p className="truncate text-xs font-semibold text-on-surface">{title}</p>
                <p className="text-xs font-bold text-primary">{t(item.priceKey)}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
