import { OnboardingPage } from '@/components/onboarding';
import { DEFAULT_LOCALE, translate } from '@/lib/i18n';

export const metadata = {
  title: translate(DEFAULT_LOCALE, 'addseller.metadataTitle'),
  description: translate(DEFAULT_LOCALE, 'addseller.metadataDescription'),
};

export default function AddSellerPage() {
  return <OnboardingPage />;
}
