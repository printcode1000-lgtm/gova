'use client';

import dynamic from 'next/dynamic';

const OnboardingDevAutofillBridge = process.env.NODE_ENV === 'development'
  ? dynamic(
      () =>
        import('@/lib/autofill/dev-autofill-bridge').then(
          (mod) => mod.OnboardingDevAutofillBridge
        ),
      { ssr: false }
    )
  : null;

export function OnboardingDevAutofillBridgeLoader() {
  if (process.env.NODE_ENV !== 'development' || !OnboardingDevAutofillBridge) return null;
  return <OnboardingDevAutofillBridge />;
}
