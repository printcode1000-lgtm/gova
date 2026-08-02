import { isDevelopment } from '@/core/config';
import { LOGIN_AUTOFILL_EVENT, setNativeInputValue } from './dom-input';

function randomPhone(): string {
  return '01026546550';
}

function randomPassword(): string {
  return '0258';
}

export type LoginAutofillOutcome = {
  success: boolean;
  filled: number;
  message: string;
};

export async function fillLoginForm(): Promise<LoginAutofillOutcome> {
  if (!isDevelopment) {
    return {
      success: false,
      filled: 0,
      message: 'Login autofill is only available in development mode',
    };
  }

  try {
    let filled = 0;

    const phoneInput = document.querySelector(
      '[data-asol-autofill="login-phone"]',
    ) as HTMLInputElement | null;
    if (phoneInput) {
      setNativeInputValue(phoneInput, randomPhone());
      filled++;
    }

    const passwordInput = document.querySelector(
      '[data-asol-autofill="login-password"]',
    ) as HTMLInputElement | null;
    if (passwordInput) {
      setNativeInputValue(passwordInput, randomPassword());
      filled++;
    }

    await new Promise((resolve) => setTimeout(resolve, 0));
    window.dispatchEvent(new Event(LOGIN_AUTOFILL_EVENT));

    return {
      success: filled > 0,
      filled,
      message: filled > 0 ? `Filled ${filled} fields` : 'No fields found',
    };
  } catch (error) {
    return {
      success: false,
      filled: 0,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
