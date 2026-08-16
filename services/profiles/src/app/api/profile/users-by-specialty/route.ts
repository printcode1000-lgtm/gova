import { assertProfilesEnv, createProfilesRuntime } from '@asol/profiles-composition';
import { corsHeaders, preflight, profileErrorResponse } from '../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Providers matching a specialty, with their avatars.
 *
 * The highest-volume profile read in the system: it backs seller search and the
 * specialty-chat recipient resolution, and it fans out one avatar lookup per
 * result.
 */
export async function GET(request: Request): Promise<Response> {
  try {
    // Layer 2. The composition is the only thing that knows which capabilities this
    // account owns. Built per request, never at module scope: module scope runs during
    // `next build`, where no account credential exists.
    const { profiles } = createProfilesRuntime();
    assertProfilesEnv();

    const url = new URL(request.url);
    const minRatingParam = url.searchParams.get('minRating');
    const users = await profiles.getUsersBySpecialty(
      Number(url.searchParams.get('categoryId') ?? '0'),
      Number(url.searchParams.get('subcategoryId') ?? '0'),
      Number(url.searchParams.get('offset') ?? '0'),
      Number(url.searchParams.get('limit') ?? '10'),
      url.searchParams.get('search') ?? undefined,
      minRatingParam ? Number(minRatingParam) : undefined,
    );
    const data = await Promise.all(
      users.map(async (user) => ({
        ...user,
        avatarUrl: (await profiles.getStoreImages(user.uid)).avatarUrl,
      })),
    );
    return Response.json(data, { status: 200, headers: corsHeaders(request) });
  } catch (error) {
    return profileErrorResponse(request, error);
  }
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
