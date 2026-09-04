import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { runTracedBusinessRoute } from '@/core/api/traced-route';
import { authService } from "@/features/auth/server";
import { parseUsersBySpecialtyQuery } from "@/features/profile";
import { profileService } from "@/features/profile/server";

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
          const [images, registrationPhone] = await Promise.all([
            profileService.getStoreImages(user.uid),
            authService.getUserPhone(user.uid),
          ]);
          return {
            ...user,
            avatarUrl: images.avatarUrl,
            registrationPhone: registrationPhone ?? "",
          };
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
