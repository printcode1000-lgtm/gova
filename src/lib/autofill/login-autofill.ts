import { isDevelopment } from '@/core/config';

const ALNUM = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function randomAlnum(length: number): string {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += ALNUM.charAt(Math.floor(Math.random() * ALNUM.length));
  }
  return out;
}

function randomDigits(length: number): string {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += Math.floor(Math.random() * 10).toString();
  }
  return out;
}

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

export function fillLoginForm(): LoginAutofillOutcome {
  if (!isDevelopment) {
    return {
      success: false,
      filled: 0,
      message: 'Login autofill is only available in development mode',
    };
  }

  try {
    let filled = 0;

    // Phone (must be 11 digits with Egyptian prefix)
    const phoneInput = document.querySelector('[data-gova-autofill="login-phone"]') as HTMLInputElement;
    if (phoneInput) {
      phoneInput.value = randomPhone();
      phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
      phoneInput.dispatchEvent(new Event('change', { bubbles: true }));
      filled++;
    }

    // Password (must be at least 4 chars)
    const passwordInput = document.querySelector('[data-gova-autofill="login-password"]') as HTMLInputElement;
    if (passwordInput) {
      passwordInput.value = randomPassword();
      passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
      passwordInput.dispatchEvent(new Event('change', { bubbles: true }));
      filled++;
    }

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
