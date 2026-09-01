import { releaseReadinessFor } from '@/control/release-readiness';

/** Full 40-character Git SHA only: a short SHA is ambiguous, and a barrier must not guess. */
const SHA = /^[0-9a-f]{40}$/;

/** Read-only boundary; the release worker owns all state mutations. */
export async function GET(_request: Request, context: { params: Promise<{ revision: string }> }) {
  const { revision } = await context.params;
  if (!SHA.test(revision)) return Response.json({ error: 'invalid_revision' }, { status: 400 });
  try {
    return Response.json({ revision, status: await releaseReadinessFor(revision) });
  } catch (error) {
    // The reason belongs to the deploy console, which is authenticated. Here it
    // would be an unauthenticated window into the runtime's configuration — so
    // the caller still gets `pending` and nothing else.
    //
    // It is logged, though. Swallowing it silently made a broken release store
    // indistinguishable from a revision that had not deployed yet: control ran
    // with no data ports registered, this endpoint answered `200 pending`, and
    // `control:smoke` passed against a runtime that could not read a shard.
    // The log line is what that gate scans.
    console.error(
      'release-readiness could not read the release state',
      error instanceof Error ? error.message : String(error),
    );
    return Response.json({ revision, status: 'pending' as const });
  }
}
