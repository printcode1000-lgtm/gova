import type {
  BrandIdentity,
  CategoriesInfo,
  ContactInfo,
  LocationInfo,
  MerchantInfo,
  StoreIdentity,
} from './onboarding-profile-types';
import type {
  CollectionsInfo,
  ProductsInfo,
} from './onboarding-product-types';
import type {
  ReturnPolicy,
  ShippingInfo,
} from './onboarding-fulfillment-types';
import type { VerificationInfo } from './onboarding-verification-types';
import type { MarketingInfo } from './onboarding-marketing-types';
import type { OnboardingStep } from './onboarding-step-types';

export interface OnboardingData {
  storeIdentity: StoreIdentity;
  merchantInfo: MerchantInfo;
  contactInfo: ContactInfo;
  location: LocationInfo;
  categories: CategoriesInfo;
  shipping: ShippingInfo;
  returns: ReturnPolicy;
  brandIdentity: BrandIdentity;
  products: ProductsInfo;
  collections: CollectionsInfo;
  verification: VerificationInfo;
  marketing: MarketingInfo;
}

export interface OnboardingState {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  data: OnboardingData;
  isDirty: boolean;
  lastSaved: string | null;
  errors: Record<string, string>;
}

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
