export type OnboardingStep =
  | 'store-identity'
  | 'merchant-info'
  | 'contact-info'
  | 'location'
  | 'categories'
  | 'shipping'
  | 'returns'
  | 'brand-identity'
  | 'products'
  | 'collections'
  | 'verification'
  | 'marketing';

export interface OnboardingStepConfig {
  id: OnboardingStep;
  title: string;
  description: string;
  icon: string;
  isComplete: boolean;
  isRequired: boolean;
}
