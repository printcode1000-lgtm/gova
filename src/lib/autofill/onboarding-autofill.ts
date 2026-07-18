import { nextSellerId } from '@/lib/seller/next-id';
import { isDevelopment } from '@/core/config';

import { constants } from '@/lib/onboarding/schemas';
import { stepOrder, useOnboardingStore } from '@/lib/onboarding/store';
import type {
  BusinessType,
  CouponCode,
  OnboardingData,
  OnboardingStep,
  Product,
  ReturnPolicyType,
  ShippingProvider,
  SocialLink,
} from '@/lib/onboarding/types';

export type OnboardingAutofillOutcome = {
  success: boolean;
  filled: number;
  skipped: number;
  message: string;
};

const ALNUM = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomAlnum(length: number): string {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += ALNUM.charAt(Math.floor(Math.random() * ALNUM.length));
  }
  return out;
}

function randomDigits(length: number): string {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += Math.floor(Math.random() * 10).toString();
  }
  return out;
}

function pickOne<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)] ?? items[0];
}

function pickMany<T>(items: readonly T[], min: number, max: number): T[] {
  const count = Math.min(items.length, randomInt(min, max));
  const copy = [...items];
  const picked: T[] = [];
  for (let i = 0; i < count; i += 1) {
    const idx = Math.floor(Math.random() * copy.length);
    picked.push(copy[idx]!);
    copy.splice(idx, 1);
  }
  return picked;
}

function randomText(minLength: number, maxLength = minLength + 24): string {
  const length = randomInt(minLength, maxLength);
  if (length <= 0) return '';
  return randomAlnum(length);
}

function buildRandomProduct(categoryName: string): Product {
  const id = nextSellerId('product');
  const variantId = nextSellerId('variant');
  const basePrice = randomInt(10, 999) + randomInt(0, 99) / 100;

  return {
    id,
    title: randomText(3, 40),
    description: randomText(20, 120),
    category: categoryName,
    subcategory: randomText(3, 16),
    tags: [randomText(3, 8), randomText(3, 8)],
    basePrice,
    discountPrice: Math.random() > 0.5 ? Math.max(1, basePrice - randomInt(1, 20)) : null,
    image: null,
    variants: [
      {
        id: variantId,
        sku: randomAlnum(8).toUpperCase(),
        size: randomText(1, 4),
        color: randomText(3, 10),
        material: randomText(3, 12),
        price: basePrice,
        discountPrice: null,
        inventory: randomInt(1, 200),
        images: [],
      },
    ],
    isActive: true,
    isFeatured: Math.random() > 0.5,
  };
}

function buildRandomOnboardingData(): OnboardingData {
  const storeCategory = pickOne(constants.storeCategories);
  const specialties = pickMany(constants.specialties, 1, 3);
  const businessType = pickOne(constants.businessTypes).value as BusinessType;
  const country = pickOne(constants.countries);
  const selectedFashion = pickMany(constants.fashionCategories, 1, 3);
  const selectedCategoryName = selectedFashion[0]?.name ?? 'Menswear';
  const shippingProvider = pickOne([
    'standard',
    'express',
    'same_day',
    'international',
  ] as const satisfies readonly ShippingProvider[]);
  const returnPolicy = pickOne([
    'full_returns',
    'exchange_only',
    'store_credit',
    'no_returns',
  ] as const satisfies readonly ReturnPolicyType[]);
  const brandValues = pickMany(constants.brandValues, 1, 4);
  const products = [buildRandomProduct(selectedCategoryName), buildRandomProduct(selectedCategoryName)];
  const collectionId = nextSellerId('collection');
  const methodId = nextSellerId('ship');
  const couponId = nextSellerId('coupon');
  const socialPlatforms = ['instagram', 'facebook', 'twitter', 'tiktok', 'youtube', 'pinterest'] as const;
  const socialLinks: SocialLink[] = pickMany(socialPlatforms, 1, 2).map((platform) => ({
    platform,
    url: `https://${randomAlnum(6)}.example.com`,
  }));

  const coupon: CouponCode = {
    id: couponId,
    code: randomAlnum(randomInt(6, 12)).toUpperCase(),
    discountType: Math.random() > 0.5 ? 'percentage' : 'fixed',
    discountValue: randomInt(5, 50),
    minPurchase: randomInt(10, 200),
    maxUses: randomInt(10, 500),
    usedCount: 0,
    expiresAt: new Date(Date.now() + randomInt(7, 90) * 86_400_000).toISOString(),
    isActive: true,
  };

  return {
    storeIdentity: {
      storeName: randomText(2, 30),
      storeLogo: null,
      coverImage: null,
      storeDescription: randomText(20, 80),
      storeStory: randomText(0, 60),
      storeCategory,
      storeSpecialties: [...specialties],
    },
    merchantInfo: {
      merchantName: randomText(2, 24),
      businessType,
      companyName: businessType === 'individual' ? '' : randomText(2, 30),
      registrationNumber: randomAlnum(8),
      taxId: randomAlnum(10),
      businessAge: pickOne([0, 1, 2, 3, 5, 10]),
    },
    contactInfo: {
      phoneNumber: `01${randomDigits(9)}`,
      whatsappNumber: `01${randomDigits(9)}`,
      email: `${randomAlnum(8)}@${randomAlnum(5)}.com`,
      website: `https://${randomAlnum(8)}.example.com`,
      socialLinks,
    },
    location: {
      country,
      city: randomText(3, 20),
      address: randomText(5, 40),
      postalCode: randomDigits(5),
      shippingRegions: [
        { country, regions: [randomText(3, 12)], isAvailable: true },
        ...pickMany(constants.countries.filter((c) => c !== country), 0, 2).map((c) => ({
          country: c,
          regions: [randomText(3, 12)],
          isAvailable: true,
        })),
      ],
    },
    categories: {
      selectedCategories: constants.fashionCategories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        isSelected: selectedFashion.some((picked) => picked.id === cat.id),
        subcategories: [],
      })),
      customCategories: [randomText(3, 16)],
    },
    shipping: {
      methods: [
        {
          id: methodId,
          provider: shippingProvider,
          name: randomText(3, 20),
          deliveryDays: { min: randomInt(1, 5), max: randomInt(6, 14) },
          fee: randomInt(0, 50),
          freeThreshold: Math.random() > 0.5 ? randomInt(50, 300) : null,
          isActive: true,
        },
      ],
      defaultMethod: methodId,
      pickupAvailable: Math.random() > 0.5,
      pickupAddress: randomText(5, 40),
    },
    returns: {
      policyType: returnPolicy,
      returnPeriod: pickOne([7, 14, 30, 60, 90]),
      exchangePeriod: pickOne([7, 14, 30]),
      policyDescription: randomText(0, 80),
      conditions: [randomText(5, 20)],
      refundMethod: pickOne(['original', 'store_credit', 'choice'] as const),
    },
    brandIdentity: {
      mission: randomText(20, 80),
      vision: randomText(20, 80),
      uniqueSellingPoints: [randomText(5, 24), randomText(5, 24)],
      targetAudience: [randomText(3, 16)],
      brandValues: [...brandValues],
    },
    products: {
      products,
      draftProducts: [],
    },
    collections: {
      collections: [
        {
          id: collectionId,
          name: randomText(2, 30),
          description: randomText(5, 60),
          coverImage: null,
          productIds: products.map((p) => p.id),
          isActive: true,
          isFeatured: true,
        },
      ],
    },
    verification: {
      documents: [],
      isVerified: false,
      requestedBadges: pickMany(['verified', 'fast_shipper', 'top_rated', 'eco_friendly'], 1, 3),
      verificationStatus: 'not_started',
    },
    marketing: {
      featuredProductIds: products.slice(0, randomInt(1, products.length)).map((p) => p.id),
      banners: [],
      campaigns: [],
      coupons: [coupon],
    },
  };
}

/** Fills all onboarding steps with random alphanumeric data (dev autofill). */
export function fillOnboardingRandomFixture(): OnboardingAutofillOutcome {
  if (!isDevelopment) {
    return {
      success: false,
      filled: 0,
      skipped: 0,
      message: 'Onboarding autofill is only available in development mode',
    };
  }

  const data = buildRandomOnboardingData();
  const completedSteps: OnboardingStep[] = [...stepOrder];

  useOnboardingStore.setState({
    currentStep: 'store-identity',
    completedSteps,
    data,
    isDirty: true,
    lastSaved: new Date().toISOString(),
    errors: {},
  });

  const fieldGroups = stepOrder.length;

  return {
    success: true,
    filled: fieldGroups,
    skipped: 0,
    message: `Addseller: ${fieldGroups} steps filled (${data.products.products.length} products, ${data.collections.collections.length} collections)`,
  };
}
