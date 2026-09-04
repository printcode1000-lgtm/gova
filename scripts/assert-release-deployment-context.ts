const RELEASE_DEPLOYMENT_CONTEXT = "ASOL_RELEASE_DEPLOYMENT_CONTEXT";

/** Production account deploys are internal steps of the two approved release commands. */
export function assertReleaseDeploymentContext(command: string): void {
  if (process.env[RELEASE_DEPLOYMENT_CONTEXT] === "approved") return;
  throw new Error(
    `${command} is internal to npm run deploy:all and npm run deploy:push:fast; direct account deployment is disabled.`,
  );
}

export { RELEASE_DEPLOYMENT_CONTEXT };
