export function withoutVsCodeDebuggerEnv(source: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const env = { ...source };
  if (env.VSCODE_INSPECTOR_OPTIONS || env.NODE_OPTIONS?.includes('ms-vscode.js-debug')) {
    delete env.NODE_OPTIONS;
    delete env.VSCODE_INSPECTOR_OPTIONS;
  }
  return env;
}
