import { apiSuccess, mapServiceError } from '@/core/api/api-response';
import { profileService } from '@/features/profile/services/profile-service.bootstrap.server';
import type { SaveProfileContactsInput } from '@/features/profile/entities/profile-contacts.entity';
import { runTracedBusinessRoute } from '../../auth/traced-route';

export async function GET(request: Request) {
  return runTracedBusinessRoute('GET /api/profile/contacts', async () => {
    try {
      const { searchParams } = new URL(request.url);
      const uid = searchParams.get('uid') ?? '';
      const contacts = await profileService.getContacts(uid);
      return apiSuccess(contacts);
    } catch (error) {
      return mapServiceError(error);
    }
  });
}

export async function PUT(request: Request) {
  return runTracedBusinessRoute('PUT /api/profile/contacts', async () => {
    try {
      const body = (await request.json()) as SaveProfileContactsInput;
      const contacts = await profileService.saveContacts(body);
      return apiSuccess(contacts);
    } catch (error) {
      return mapServiceError(error);
    }
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
