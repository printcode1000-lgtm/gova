/**
 * Strips inspector flags before spawning build children.
 *
 * `next build` inherits NODE_OPTIONS; when it carries `--inspect` (VS Code
 * auto-attach, or a terminal started under a debugger) the build worker crashes
 * while prerendering pages. Mirrors `withoutDebuggerEnvironment` in
 * `src/modules/google-play-console/domain/development-guard.server.ts`.
 */
const INSPECTOR_FLAG = /(^|\s)--inspect(-brk|-port|-publish-uid)?(=\S*)?(?=\s|$)/g;
const INSPECTOR_BOOTLOADER = /(^|\s)--require\s+\S*js-debug\S*(?=\s|$)/g;

export function withoutVsCodeDebuggerEnv(source: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const env = { ...source };
  delete env.VSCODE_INSPECTOR_OPTIONS;
  delete env.NODE_INSPECT_RESUME_ON_START;
  const options = env.NODE_OPTIONS
    ?.replace(INSPECTOR_BOOTLOADER, ' ')
    .replace(INSPECTOR_FLAG, ' ')
    .trim();
  if (options) env.NODE_OPTIONS = options;
  else delete env.NODE_OPTIONS;
  return env;
}
