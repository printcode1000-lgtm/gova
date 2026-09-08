/**
 * dev-core — the Development-runtime guard, and nothing else.
 *
 * This package used to own local persistence too: SQLite filenames, the
 * `public/sync_data` path segments, the shard-file naming rule, and the public
 * URL a locally stored image was served from. None of that exists any more —
 * server data is Turso and image objects are Cloudflare R2 in every runtime — so
 * what remains is the one responsibility that was never about storage: deciding
 * whether the current runtime is a developer's machine, so developer-only
 * tooling can refuse to run on Vercel, during a static export, or in a
 * production build.
 */
export {
  assertLocalDevelopmentAllowed,
  assertStrictLocalDevelopmentAllowed,
  buildLocalDevelopmentEnvironment,
  isLocalDevelopmentRuntime,
  isStrictLocalDevelopmentRuntime,
  type AppDeployment,
  type LocalDevelopmentEnvironment,
  type LocalDevelopmentRuntimeInput,
} from "./guards/development-guard";
