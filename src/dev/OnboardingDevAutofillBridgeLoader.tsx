'use client';

import dynamic from 'next/dynamic';

const OnboardingDevAutofillBridge = dynamic(
  () =>
    import('@/lib/onboarding/dev-autofill-bridge').then((mod) => mod.OnboardingDevAutofillBridge),
  { ssr: false }
);

export function OnboardingDevAutofillBridgeLoader() {
  if (process.env.NODE_ENV !== 'development') return null;
  return <OnboardingDevAutofillBridge />;
}
