import { apiSuccess, apiError } from '@/core/api/api-response';
import { authService } from '@/features/auth/services/auth-service.bootstrap.server';
import { runTracedBusinessRoute } from '../traced-route';

/**
 * GET /api/auth/check-phone?phone=01xxxxxxxxx
 * Returns { exists: true } if the phone is already registered, { exists: false } otherwise.
 * Used by the registration flow to validate uniqueness before sending an OTP.
 */
export async function GET(request: Request) {
  return runTracedBusinessRoute('GET /api/auth/check-phone', async () => {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone')?.trim() ?? '';

    if (!phone || phone.length < 10) {
      return apiError('invalidPhone', 400);
    }

    const result = await authService.checkPhone(phone);
    return apiSuccess(result);
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
