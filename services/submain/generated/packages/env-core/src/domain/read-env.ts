/**
 * How this project reads an environment variable.
 *
 * Which keys a package needs is that package's own business — `@asol/account-declarations` owns
 * the deployment key lists, and each capability package reads the credentials it holds. What was
 * being re-derived everywhere is smaller and duller than that: whether an empty string counts as
 * absent, whether a value is trimmed, what a missing required key throws, and which of two legacy
 * spellings wins. Four spellings of "read this variable" is four ways for `""` to mean something
 * different.
 *
 * `env` is a parameter with a `process.env` default, so a caller can pass a parsed `.env` file or
 * a fixture without touching the real environment.
 */
export type EnvSource = Record<string, string | undefined>;

/** Trimmed, or `undefined` when absent or blank. Blank is absent: an empty key is unconfigured. */
export function readOptionalEnv(key: string, env: EnvSource = process.env): string | undefined {
  const value = env[key];
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

/** Trimmed, or the fallback (`''` by default). Never `undefined`. */
export function readEnv(key: string, fallback = '', env: EnvSource = process.env): string {
  return readOptionalEnv(key, env) ?? fallback;
}

/**
 * Trimmed, or a throw naming the key.
 *
 * The message is the key and why it is needed, because the reader of that stack trace is usually
 * looking at a failed deployment rather than at this code.
 */
export function requireEnv(key: string, env: EnvSource = process.env): string {
  const value = readOptionalEnv(key, env);
  if (value === undefined) throw new Error(`${key} environment variable is not set`);
  return value;
}

/** The first key that is set. Used wherever a variable has a legacy spelling still in the wild. */
export function firstEnv(keys: readonly string[], env: EnvSource = process.env): string | undefined {
  for (const key of keys) {
    const value = readOptionalEnv(key, env);
    if (value !== undefined) return value;
  }
  return undefined;
}

/** Whether a variable is set at all. Presence, never the value — health endpoints ask this. */
export function hasEnv(key: string, env: EnvSource = process.env): boolean {
  return readOptionalEnv(key, env) !== undefined;
}

/**
 * `"1"` and `"true"` are true; everything else, including absent, is false.
 *
 * Deliberately not "any non-empty string is true": `VERCEL=0` should not enable a Vercel branch.
 */
export function readBooleanEnv(key: string, env: EnvSource = process.env): boolean {
  const value = readOptionalEnv(key, env)?.toLowerCase();
  return value === '1' || value === 'true';
}

/** A comma-separated list, trimmed and blank-free. Empty list when unset. */
export function readListEnv(key: string, env: EnvSource = process.env): string[] {
  return (readOptionalEnv(key, env) ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}
