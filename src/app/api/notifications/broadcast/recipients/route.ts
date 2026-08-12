import { apiSuccess, mapServiceError } from '@/core/api/api-response';
import { notificationsServer } from '@/features/notifications/server';
import { runTracedBusinessRoute } from '../../../auth/traced-route';

export async function GET(request: Request) {
  return runTracedBusinessRoute('GET /api/notifications/broadcast/recipients', async () => {
    try {
      const url = new URL(request.url);
      return apiSuccess(
        await notificationsServer.listBroadcastRecipients({
          uid: url.searchParams.get('uid') ?? '',
          phone: url.searchParams.get('phone') ?? '',
        }),
      );
    } catch (error) {
      return mapServiceError(error);
    }
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
