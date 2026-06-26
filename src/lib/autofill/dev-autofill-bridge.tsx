'use client';

import { useEffect } from 'react';

import { fillOnboardingRandomFixture, type OnboardingAutofillOutcome } from './onboarding-autofill';

declare global {
  interface Window {
    __GOVA_ADDSELLER_AUTOFILL__?: () => OnboardingAutofillOutcome;
  }
}

/** Registers dev autofill hook for onboarding forms in development mode. */
export function OnboardingDevAutofillBridge() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return undefined;

    window.__GOVA_ADDSELLER_AUTOFILL__ = () => fillOnboardingRandomFixture();

    return () => {
      delete window.__GOVA_ADDSELLER_AUTOFILL__;
    };
  }, []);

  return null;
}
