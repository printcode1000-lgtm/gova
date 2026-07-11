import { apiSuccess, mapServiceError } from '@/core/api/api-response';
import { notificationSendService } from '@/features/notifications/services/notification-service.bootstrap.server';
import type { SendNotificationToUsersInput } from '@/features/notifications/domain/entities';
import { runTracedBusinessRoute } from '../../auth/traced-route';

export async function POST(request: Request) {
  return runTracedBusinessRoute('POST /api/notifications/send', async () => {
    try {
      const body = (await request.json()) as SendNotificationToUsersInput;
      const result = await notificationSendService.sendToUsers(body);
      return apiSuccess(result);
    } catch (error) {
      return mapServiceError(error);
    }
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
