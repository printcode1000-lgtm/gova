'use client';

import { useEffect } from 'react';

import { isAutofillMode } from '@/dev/autofill-mode';

import { fillOnboardingRandomFixture, type OnboardingAutofillOutcome } from './autofill-fixture';

declare global {
  interface Window {
    __GOVA_ADDSELLER_AUTOFILL__?: () => OnboardingAutofillOutcome;
  }
}

/** Registers dev autofill hook when `?autofill=1` is active on /addseller. */
export function OnboardingDevAutofillBridge() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return undefined;
    if (!isAutofillMode(window.location.search)) return undefined;

    window.__GOVA_ADDSELLER_AUTOFILL__ = () => fillOnboardingRandomFixture();

    return () => {
      delete window.__GOVA_ADDSELLER_AUTOFILL__;
    };
  }, []);

  return null;
}
