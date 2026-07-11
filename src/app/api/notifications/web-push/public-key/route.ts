import { apiSuccess, mapServiceError } from '@/core/api/api-response';
import { notificationVapidService } from '@/features/notifications/services/notification-service.bootstrap.server';
import { runTracedBusinessRoute } from '../../../auth/traced-route';

export async function GET() {
  return runTracedBusinessRoute('GET /api/notifications/web-push/public-key', async () => {
    try {
      return apiSuccess(await notificationVapidService.getPublic());
    } catch (error) {
      return mapServiceError(error);
    }
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
