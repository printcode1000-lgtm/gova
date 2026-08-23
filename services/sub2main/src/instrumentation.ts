/**
 * Registers this account's ports before the first request.
 *
 * An isolated deployment has no `src/instrumentation.ts` from the application,
 * so nothing configures `@asol/data-core`'s runtime-config port and every route
 * that reaches a repository answers
 * `dataCoreRuntimeConfig: getServerRuntimeContext is not configured` — a 500 on
 * real traffic while `/api/health` stays 200, because health touches no shard.
 * The service deploys READY and is broken.
 *
 * Importing the composition package runs its registration: the module wires the
 * ports at module scope, which is what a composition root is for.
 *
 * sub2main's route files re-export handlers from the mirrored application and do
 * not import the composition themselves, so without this hook the registration
 * never ran at all.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  await import('@asol/sub2main-composition');
}
