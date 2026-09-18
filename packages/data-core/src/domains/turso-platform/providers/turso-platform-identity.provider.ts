import { asolHttpFetch } from '../../../ports/runtime-config';

const PLATFORM_API_BASE = 'https://api.turso.tech/v1';

/** Who owns a Turso organization's token, and which databases the organization holds. */
export type TursoOrganizationIdentity = {
  readonly ownerEmail: string | null;
  readonly ownerUsername: string | null;
  readonly databaseNames: readonly string[];
};

type CurrentUserResponse = {
  readonly user?: { readonly email?: string; readonly username?: string };
};

type DatabasesResponse = {
  readonly databases?: readonly { readonly Name?: string; readonly name?: string }[];
};

async function platformGet<T>(url: string, apiToken: string): Promise<T> {
  const response = await asolHttpFetch(url, {
    headers: { Authorization: `Bearer ${apiToken}` },
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Turso ${new URL(url).pathname} API returned HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

/**
 * Reads the token owner's login and the organization's database names. Names
 * only: no URL, token, or credential leaves this function.
 */
export async function readTursoOrganizationIdentity(input: {
  readonly organization: string;
  readonly apiToken: string;
}): Promise<TursoOrganizationIdentity> {
  const [user, databases] = await Promise.all([
    platformGet<CurrentUserResponse>(`${PLATFORM_API_BASE}/current-user`, input.apiToken),
    platformGet<DatabasesResponse>(
      `${PLATFORM_API_BASE}/organizations/${encodeURIComponent(input.organization)}/databases`,
      input.apiToken,
    ),
  ]);
  return {
    ownerEmail: user.user?.email ?? null,
    ownerUsername: user.user?.username ?? null,
    databaseNames: (databases.databases ?? [])
      .map((database) => database.Name ?? database.name ?? '')
      .filter(Boolean)
      .sort(),
  };
}
