'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ASOL_DB_STORES, createAsolDbZustandStorage } from '@/lib/asol-db';
import { nextSellerId } from '@/lib/seller/next-id';
import type {
  OnboardingStep,
  OnboardingData,
  OnboardingState,
  Product,
  Collection,
  FashionCategory,
} from './types';
import type { StoredImage } from '@/core/storage/types/stored-image.types';
import { constants } from './schemas';

const initialStoreIdentity: OnboardingData['storeIdentity'] = {
  storeName: '',
  storeLogo: null,
  coverImage: null,
  storeDescription: '',
  storeStory: '',
  storeCategory: '',
  storeSpecialties: [],
};

const initialMerchantInfo: OnboardingData['merchantInfo'] = {
  merchantName: '',
  businessType: '',
  companyName: '',
  registrationNumber: '',
  taxId: '',
  businessAge: '',
};

const initialContactInfo: OnboardingData['contactInfo'] = {
  phoneNumber: '',
  whatsappNumber: '',
  email: '',
  website: '',
  socialLinks: [],
};

const initialLocation: OnboardingData['location'] = {
  country: '',
  city: '',
  address: '',
  postalCode: '',
  shippingRegions: [],
};

const initialCategories: OnboardingData['categories'] = {
  selectedCategories: constants.fashionCategories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    isSelected: false,
    subcategories: [],
  })),
  customCategories: [],
};

const initialShipping: OnboardingData['shipping'] = {
  methods: [],
  defaultMethod: '',
  pickupAvailable: false,
  pickupAddress: '',
};

const initialReturns: OnboardingData['returns'] = {
  policyType: 'full_returns',
  returnPeriod: 30,
  exchangePeriod: 30,
  policyDescription: '',
  conditions: [],
  refundMethod: 'original',
};

const initialBrandIdentity: OnboardingData['brandIdentity'] = {
  mission: '',
  vision: '',
  uniqueSellingPoints: [],
  targetAudience: [],
  brandValues: [],
};

const initialProducts: OnboardingData['products'] = {
  products: [],
  draftProducts: [],
};

const initialCollections: OnboardingData['collections'] = {
  collections: [],
};

const initialVerification: OnboardingData['verification'] = {
  documents: [],
  isVerified: false,
  requestedBadges: [],
  verificationStatus: 'not_started',
};

const initialMarketing: OnboardingData['marketing'] = {
  featuredProductIds: [],
  banners: [],
  campaigns: [],
  coupons: [],
};

const initialData: OnboardingData = {
  storeIdentity: initialStoreIdentity,
  merchantInfo: initialMerchantInfo,
  contactInfo: initialContactInfo,
  location: initialLocation,
  categories: initialCategories,
  shipping: initialShipping,
  returns: initialReturns,
  brandIdentity: initialBrandIdentity,
  products: initialProducts,
  collections: initialCollections,
  verification: initialVerification,
  marketing: initialMarketing,
};

const stepOrder: OnboardingStep[] = [
  'store-identity',
  'merchant-info',
  'contact-info',
  'location',
  'categories',
  'shipping',
  'returns',
  'brand-identity',
  'products',
  'collections',
  'verification',
  'marketing',
];

interface OnboardingStore extends OnboardingState {
  setCurrentStep: (step: OnboardingStep) => void;
  updateStoreIdentity: (data: Partial<OnboardingData['storeIdentity']>) => void;
  updateMerchantInfo: (data: Partial<OnboardingData['merchantInfo']>) => void;
  updateContactInfo: (data: Partial<OnboardingData['contactInfo']>) => void;
  updateLocation: (data: Partial<OnboardingData['location']>) => void;
  updateCategories: (data: Partial<OnboardingData['categories']>) => void;
  updateShipping: (data: Partial<OnboardingData['shipping']>) => void;
  updateReturns: (data: Partial<OnboardingData['returns']>) => void;
  updateBrandIdentity: (data: Partial<OnboardingData['brandIdentity']>) => void;
  updateProducts: (data: Partial<OnboardingData['products']>) => void;
  updateCollections: (data: Partial<OnboardingData['collections']>) => void;
  updateVerification: (data: Partial<OnboardingData['verification']>) => void;
  updateMarketing: (data: Partial<OnboardingData['marketing']>) => void;
  markStepComplete: (step: OnboardingStep) => void;
  markStepIncomplete: (step: OnboardingStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: OnboardingStep) => void;
  reset: () => void;
  getProgress: () => number;
  isStepComplete: (step: OnboardingStep) => boolean;
  addProduct: (product: Product) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  removeProduct: (id: string) => void;
  addCollection: (collection: Collection) => void;
  updateCollection: (id: string, collection: Partial<Collection>) => void;
  removeCollection: (id: string) => void;
  toggleCategory: (categoryId: string) => void;
  setStoreImage: (field: 'storeLogo' | 'coverImage', image: StoredImage | null) => void;
}

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set, get) => ({
      currentStep: 'store-identity',
      completedSteps: [],
      data: initialData,
      isDirty: false,
      lastSaved: null,
      errors: {},

      setCurrentStep: (step) => set({ currentStep: step }),

      updateStoreIdentity: (data) =>
        set((state) => ({
          data: { ...state.data, storeIdentity: { ...state.data.storeIdentity, ...data } },
          isDirty: true,
        })),

      updateMerchantInfo: (data) =>
        set((state) => ({
          data: { ...state.data, merchantInfo: { ...state.data.merchantInfo, ...data } },
          isDirty: true,
        })),

      updateContactInfo: (data) =>
        set((state) => ({
          data: { ...state.data, contactInfo: { ...state.data.contactInfo, ...data } },
          isDirty: true,
        })),

      updateLocation: (data) =>
        set((state) => ({
          data: { ...state.data, location: { ...state.data.location, ...data } },
          isDirty: true,
        })),

      updateCategories: (data) =>
        set((state) => ({
          data: { ...state.data, categories: { ...state.data.categories, ...data } },
          isDirty: true,
        })),

      updateShipping: (data) =>
        set((state) => ({
          data: { ...state.data, shipping: { ...state.data.shipping, ...data } },
          isDirty: true,
        })),

      updateReturns: (data) =>
        set((state) => ({
          data: { ...state.data, returns: { ...state.data.returns, ...data } },
          isDirty: true,
        })),

      updateBrandIdentity: (data) =>
        set((state) => ({
          data: { ...state.data, brandIdentity: { ...state.data.brandIdentity, ...data } },
          isDirty: true,
        })),

      updateProducts: (data) =>
        set((state) => ({
          data: { ...state.data, products: { ...state.data.products, ...data } },
          isDirty: true,
        })),

      updateCollections: (data) =>
        set((state) => ({
          data: { ...state.data, collections: { ...state.data.collections, ...data } },
          isDirty: true,
        })),

      updateVerification: (data) =>
        set((state) => ({
          data: { ...state.data, verification: { ...state.data.verification, ...data } },
          isDirty: true,
        })),

      updateMarketing: (data) =>
        set((state) => ({
          data: { ...state.data, marketing: { ...state.data.marketing, ...data } },
          isDirty: true,
        })),

      markStepComplete: (step) =>
        set((state) => ({
          completedSteps: state.completedSteps.includes(step)
            ? state.completedSteps
            : [...state.completedSteps, step],
        })),

      markStepIncomplete: (step) =>
        set((state) => ({
          completedSteps: state.completedSteps.filter((s) => s !== step),
        })),

      nextStep: () => {
        const current = get().currentStep;
        const idx = stepOrder.indexOf(current);
        if (idx < stepOrder.length - 1) {
          set({ currentStep: stepOrder[idx + 1] });
        }
      },

      prevStep: () => {
        const current = get().currentStep;
        const idx = stepOrder.indexOf(current);
        if (idx > 0) {
          set({ currentStep: stepOrder[idx - 1] });
        }
      },

      goToStep: (step) => set({ currentStep: step }),

      reset: () =>
        set({
          currentStep: 'store-identity',
          completedSteps: [],
          data: initialData,
          isDirty: false,
          lastSaved: null,
          errors: {},
        }),

      getProgress: () => {
        const total = stepOrder.length;
        const completed = get().completedSteps.length;
        return Math.round((completed / total) * 100);
      },

      isStepComplete: (step) => get().completedSteps.includes(step),

      addProduct: (product) =>
        set((state) => ({
          data: {
            ...state.data,
            products: {
              ...state.data.products,
              products: [...state.data.products.products, product],
            },
          },
          isDirty: true,
        })),

      updateProduct: (id, product) =>
        set((state) => ({
          data: {
            ...state.data,
            products: {
              ...state.data.products,
              products: state.data.products.products.map((p) =>
                p.id === id ? { ...p, ...product } : p
              ),
            },
          },
          isDirty: true,
        })),

      removeProduct: (id) =>
        set((state) => ({
          data: {
            ...state.data,
            products: {
              ...state.data.products,
              products: state.data.products.products.filter((p) => p.id !== id),
            },
          },
          isDirty: true,
        })),

      addCollection: (collection) =>
        set((state) => ({
          data: {
            ...state.data,
            collections: {
              ...state.data.collections,
              collections: [...state.data.collections.collections, collection],
            },
          },
          isDirty: true,
        })),

      updateCollection: (id, collection) =>
        set((state) => ({
          data: {
            ...state.data,
            collections: {
              ...state.data.collections,
              collections: state.data.collections.collections.map((c) =>
                c.id === id ? { ...c, ...collection } : c
              ),
            },
          },
          isDirty: true,
        })),

      removeCollection: (id) =>
        set((state) => ({
          data: {
            ...state.data,
            collections: {
              ...state.data.collections,
              collections: state.data.collections.collections.filter((c) => c.id !== id),
            },
          },
          isDirty: true,
        })),

      toggleCategory: (categoryId) =>
        set((state) => ({
          data: {
            ...state.data,
            categories: {
              ...state.data.categories,
              selectedCategories: state.data.categories.selectedCategories.map(
                (cat: FashionCategory) =>
                  cat.id === categoryId ? { ...cat, isSelected: !cat.isSelected } : cat
              ),
            },
          },
          isDirty: true,
        })),

      setStoreImage: (field, image) =>
        set((state) => {
          if (field === 'storeLogo') {
            return {
              data: {
                ...state.data,
                storeIdentity: { ...state.data.storeIdentity, storeLogo: image },
              },
              isDirty: true,
            };
          }
          return {
            data: {
              ...state.data,
              storeIdentity: { ...state.data.storeIdentity, coverImage: image },
            },
            isDirty: true,
          };
        }),
    }),
    {
      name: 'merchant-onboarding',
      storage: createJSONStorage(() => createAsolDbZustandStorage(ASOL_DB_STORES.SELLER_ONBOARDING)),
      partialize: (state) => ({
        currentStep: state.currentStep,
        completedSteps: state.completedSteps,
        data: state.data,
        lastSaved: state.lastSaved,
      }),
    }
  )
);

export { stepOrder };
