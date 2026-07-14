import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { profileService } from "@/features/profile/services/profile-service.bootstrap.server";
import { runTracedBusinessRoute } from "../../auth/traced-route";

export async function GET(request: Request) {
  return runTracedBusinessRoute("GET /api/profile/users-by-specialty", async () => {
    try {
      const url = new URL(request.url);
      const categoryId = Number(url.searchParams.get("categoryId") ?? "0");
      const subcategoryId = Number(url.searchParams.get("subcategoryId") ?? "0");
      const offset = Number(url.searchParams.get("offset") ?? "0");
      const limit = Number(url.searchParams.get("limit") ?? "10");
      const search = url.searchParams.get("search") ?? undefined;
      const minRatingParam = url.searchParams.get("minRating");
      const minRating = minRatingParam ? Number(minRatingParam) : undefined;
      
      const users = await profileService.getUsersBySpecialty(categoryId, subcategoryId, offset, limit, search, minRating);
      
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
