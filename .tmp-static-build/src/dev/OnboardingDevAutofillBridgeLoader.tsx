'use client';

import dynamic from 'next/dynamic';
import { isDevelopment } from '@/core/config';

const OnboardingDevAutofillBridge = isDevelopment
  ? dynamic(
      () =>
        import('@/lib/autofill/dev-autofill-bridge').then(
          (mod) => mod.OnboardingDevAutofillBridge
        ),
      { ssr: false }
    )
  : null;

export function OnboardingDevAutofillBridgeLoader() {
  if (!isDevelopment || !OnboardingDevAutofillBridge) return null;
  return <OnboardingDevAutofillBridge />;
}
