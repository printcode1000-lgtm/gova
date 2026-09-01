import { buildHeaders, withTeam } from './index';

/**
 * Delete one Vercel project environment entry by its stable id.
 *
 * This lives inside the sealed Vercel deploy package so scripts never call the
 * Vercel REST API directly. It never reads or logs an environment value.
 */
export async function deleteProjectEnv(
  token: string,
  projectId: string,
  envId: string,
  teamId?: string,
): Promise<void> {
  const response = await fetch(
    withTeam(`https://api.vercel.com/v9/projects/${encodeURIComponent(projectId)}/env/${encodeURIComponent(envId)}`, teamId),
    { method: 'DELETE', headers: buildHeaders(token) },
  );
  if (response.status === 404) return;
  if (!response.ok) {
    throw new Error(`Failed to delete project environment entry: ${response.status} ${await response.text()}`);
  }
}
