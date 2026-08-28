import { apiSuccess, apiError } from '@/core/api/api-response';
import { authService } from '@/features/auth/server';
import { runTracedBusinessRoute } from '@/core/api/traced-route';
import { isValidPhone } from '@asol/auth-core/server';

/**
 * GET /api/auth/check-phone?phone=+201xxxxxxxxx
 * Returns { exists: true } if the phone is already registered, { exists: false } otherwise.
 * Used by the registration flow to validate uniqueness before sending an OTP.
 */
export async function GET(request: Request) {
  return runTracedBusinessRoute('GET /api/auth/check-phone', async () => {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone')?.trim() ?? '';

    // The phone domain owns what a number is; the route only refuses what it
    // could never look up.
    if (!isValidPhone(phone)) {
      return apiError('invalidPhone', 400);
    }

    const result = await authService.checkPhone(phone);
    return apiSuccess(result);
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
