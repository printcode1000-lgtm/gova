import { apiSuccess, mapServiceError } from '@/core/api/api-response';
import { notificationVapidService } from '@/features/notifications/services/notification-service.bootstrap.server';
import type {
  GenerateNotificationVapidInput,
  SaveNotificationVapidInput,
} from '@/features/notifications/domain/entities';
import { runTracedBusinessRoute } from '../../../auth/traced-route';

export async function GET(request: Request) {
  return runTracedBusinessRoute('GET /api/notifications/web-push/vapid', async () => {
    try {
      const url = new URL(request.url);
      return apiSuccess(
        await notificationVapidService.getAdmin({
          uid: url.searchParams.get('uid') ?? '',
          phone: url.searchParams.get('phone') ?? '',
        }),
      );
    } catch (error) {
      return mapServiceError(error);
    }
  });
}

export async function POST(request: Request) {
  return runTracedBusinessRoute('POST /api/notifications/web-push/vapid', async () => {
    try {
      const body = (await request.json()) as GenerateNotificationVapidInput;
      return apiSuccess(await notificationVapidService.generate(body));
    } catch (error) {
      return mapServiceError(error);
    }
  });
}

export async function PUT(request: Request) {
  return runTracedBusinessRoute('PUT /api/notifications/web-push/vapid', async () => {
    try {
      const body = (await request.json()) as SaveNotificationVapidInput;
      return apiSuccess(await notificationVapidService.save(body));
    } catch (error) {
      return mapServiceError(error);
    }
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
