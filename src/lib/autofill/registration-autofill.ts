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

function randomEmail(): string {
  return `${randomAlnum(8)}@example.com`;
}

function randomPhone(): string {
  const prefixes = ['010', '011', '012', '015'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  return `${prefix}${randomDigits(8)}`;
}

function randomPassword(): string {
  return `${randomAlnum(12)}!@#`;
}

/** Trigger a React-controlled input value change via native setter. */
function setNativeValue(input: HTMLInputElement, value: string) {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )?.set;
  nativeInputValueSetter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

export type RegistrationAutofillOutcome = {
  success: boolean;
  filled: number;
  message: string;
};

export async function fillRegistrationForm(): Promise<RegistrationAutofillOutcome> {
  if (process.env.NODE_ENV !== 'development') {
    return {
      success: false,
      filled: 0,
      message: 'Registration autofill is only available in development mode',
    };
  }

  try {
    let filled = 0;

    // Phone first (required for verification)
    const phoneInput = document.querySelector('[data-gova-autofill="registration-phone"]') as HTMLInputElement;
    if (phoneInput) {
      setNativeValue(phoneInput, randomPhone());
      filled++;
    }

    // Password
    const passwordInput = document.querySelector('[data-gova-autofill="registration-password"]') as HTMLInputElement;
    if (passwordInput) {
      const pwd = randomPassword();
      setNativeValue(passwordInput, pwd);
      filled++;

      // Confirm Password (must match)
      const confirmPasswordInput = document.querySelector('[data-gova-autofill="registration-confirm-password"]') as HTMLInputElement;
      if (confirmPasswordInput) {
        setNativeValue(confirmPasswordInput, pwd);
        filled++;
      }
    }

    // Email
    const emailInput = document.querySelector('[data-gova-autofill="registration-email"]') as HTMLInputElement;
    if (emailInput) {
      setNativeValue(emailInput, randomEmail());
      filled++;
    }

    // Wait for React to process state updates and re-enable the verify button
    await new Promise(resolve => setTimeout(resolve, 200));

    // Click Verify Phone Button
    const verifyButton = document.querySelector('[data-gova-autofill="registration-verify-phone"]') as HTMLButtonElement;
    if (verifyButton && !verifyButton.disabled) {
      verifyButton.click();
      filled++;

      // In dev mode, handleSendOtp auto-sets phoneVerified = true after 300ms
      // Wait for that to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('[Autofill] Phone verified via dev auto-verification');
    } else if (verifyButton?.disabled) {
      console.warn('[Autofill] Verify button still disabled — phone state may not have updated');
    }

    return {
      success: filled > 0,
      filled,
      message: filled > 0 ? `Autofill complete: ${filled} fields filled` : 'No fields found',
    };
  } catch (error) {
    return {
      success: false,
      filled: 0,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

