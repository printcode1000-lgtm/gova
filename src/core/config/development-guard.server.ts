import 'server-only';

import {
  assertLocalDevelopmentAllowed,
  assertStrictLocalDevelopmentAllowed,
  buildLocalDevelopmentEnvironment,
  isLocalDevelopmentRuntime,
  isStrictLocalDevelopmentRuntime,
  readLocalDevelopmentRuntimeFromProcess,
  type LocalDevelopmentEnvironment,
  type LocalDevelopmentRuntimeInput,
} from '@asol/dev-core/server';

import { getServerRuntimeContext } from './runtime-context.server';

/**
 * "Is this a developer's machine?" — asked once.
 *
 * The rules themselves belong to `@asol/dev-core`. What was duplicated is the wiring around
 * them: three developer modules each rebuilt the same runtime input from the server context and
 * the environment, and they did not agree — one used the plain gate, one the strict gate, and one
 * hand-rolled a third answer. A tool that deletes rows and a tool that lists them must not
 * disagree about where they are running.
 *
 * `strict` is the difference that matters: the plain gate asks only whether this build is a
 * development build, while the strict gate also refuses Vercel, static export, and the
 * production-build phase. Destructive tooling takes the strict one.
 */
export type DevelopmentGuardMode = { strict?: boolean };

function runtimeInput(): LocalDevelopmentRuntimeInput {
  return readLocalDevelopmentRuntimeFromProcess(getServerRuntimeContext());
}

export function isDevelopmentToolingAllowed({ strict = false }: DevelopmentGuardMode = {}): boolean {
  const input = runtimeInput();
  return strict ? isStrictLocalDevelopmentRuntime(input) : isLocalDevelopmentRuntime(input);
}

/** Throws `errorCode` when the caller is not on a developer machine. */
export function assertDevelopmentToolingAllowed(
  errorCode: string,
  { strict = false }: DevelopmentGuardMode = {},
): void {
  const input = runtimeInput();
  if (strict) assertStrictLocalDevelopmentAllowed(input, errorCode);
  else assertLocalDevelopmentAllowed(input, errorCode);
}

/** The environment report the developer consoles render. */
export function developmentToolingEnvironment(
  mode: DevelopmentGuardMode = {},
): LocalDevelopmentEnvironment {
  return {
    ...buildLocalDevelopmentEnvironment(runtimeInput()),
    allowed: isDevelopmentToolingAllowed(mode),
  };
}
