import "server-only";

export function catalogStudioChildProcessEnv(
  overrides: Record<string, string>,
): NodeJS.ProcessEnv {
  return { ...process.env, ...overrides };
}
