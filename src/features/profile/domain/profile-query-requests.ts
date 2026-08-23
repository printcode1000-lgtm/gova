/**
 * Query shapes for the profile reads that two deployments answer.
 *
 * `users-by-specialty` is the highest-volume profile read in the system and both the main
 * application and the profiles mirror parse it. Six parameters with six defaults, written twice,
 * is a pagination bug waiting for whichever deployment the bridge reaches.
 */
export interface UsersBySpecialtyQuery {
  categoryId: number;
  subcategoryId: number;
  offset: number;
  limit: number;
  search: string | undefined;
  minRating: number | undefined;
}

export const USERS_BY_SPECIALTY_DEFAULT_LIMIT = 10;

export function parseUsersBySpecialtyQuery(params: URLSearchParams): UsersBySpecialtyQuery {
  const minRating = params.get("minRating");
  return {
    categoryId: Number(params.get("categoryId") ?? "0"),
    subcategoryId: Number(params.get("subcategoryId") ?? "0"),
    offset: Number(params.get("offset") ?? "0"),
    limit: Number(params.get("limit") ?? String(USERS_BY_SPECIALTY_DEFAULT_LIMIT)),
    search: params.get("search") ?? undefined,
    minRating: minRating ? Number(minRating) : undefined,
  };
}
