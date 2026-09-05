import { assertProfilesEnv, createProfilesRuntime } from '@asol/profiles-composition';
import { parseUsersBySpecialtyQuery } from '@/features/profile/domain/profile-query-requests';
import { toProfileDirectoryEntry } from '@/features/profile/domain/profile-directory-entry.entity';
import { jsonResponse, preflight, profileErrorResponse } from '../../../lib/http';

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
    const { database } = createProfilesRuntime();
    assertProfilesEnv();

    // Parsed by the same function the main application uses: one URL, one meaning.
    const query = parseUsersBySpecialtyQuery(new URL(request.url).searchParams);
    const users = await database.profiles.getUsersBySpecialty(
      query.categoryId,
      query.subcategoryId,
      query.offset,
      query.limit,
      query.search,
      query.minRating,
    );
    const data = await Promise.all(
      users.map(async (user) =>
        toProfileDirectoryEntry(user, {
          avatarUrl: (await database.profiles.getStoreImages(user.uid)).avatarUrl,
        }),
      ),
    );
    return jsonResponse(request, data);
  } catch (error) {
    return profileErrorResponse(request, error);
  }
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
