import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { parseUsersBySpecialtyQuery } from "@/features/profile";
import { profileService } from "@/features/profile/server";
import { runTracedBusinessRoute } from '@/core/api/traced-route';

export async function GET(request: Request) {
  return runTracedBusinessRoute("GET /api/profile/users-by-specialty", async () => {
    try {
      const query = parseUsersBySpecialtyQuery(new URL(request.url).searchParams);
      const users = await profileService.getUsersBySpecialty(
        query.categoryId,
        query.subcategoryId,
        query.offset,
        query.limit,
        query.search,
        query.minRating,
      );

      const usersWithAvatarUrls = await Promise.all(
        users.map(async (user) => {
          const images = await profileService.getStoreImages(user.uid);
          return { ...user, avatarUrl: images.avatarUrl };
        }),
      );

      return apiSuccess(usersWithAvatarUrls);
    } catch (error) {
      return mapServiceError(error);
    }
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
