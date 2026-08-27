import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

const ISSUER = "https://token.actions.githubusercontent.com";
export const GITHUB_DEPLOY_AUDIENCE = "asol-production-deploy";
export const GITHUB_DEPLOY_WORKFLOW = ".github/workflows/deploy-main.yml";
const githubKeys = createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks`));

export interface GitHubPushIdentity {
  repository: string;
  revision: string;
  actor: string;
  runId: string;
}

export function resolveDeploymentRepository(env: NodeJS.ProcessEnv = process.env): string | null {
  const explicit = env.ASOL_DEPLOY_GITHUB_REPOSITORY?.trim() || env.GITHUB_REPOSITORY?.trim();
  if (explicit && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(explicit)) return explicit;
  const url = env.ASOL_DEPLOY_REPOSITORY_URL?.trim() ?? "";
  const match = /^https:\/\/github\.com\/([^/]+\/[^/]+?)(?:\.git)?$/.exec(url);
  return match?.[1] ?? null;
}

export function validateGitHubPushClaims(
  claims: JWTPayload,
  expectedRepository: string,
): GitHubPushIdentity {
  const repository = typeof claims.repository === "string" ? claims.repository : "";
  const revision = typeof claims.sha === "string" ? claims.sha.toLowerCase() : "";
  const actor = typeof claims.actor === "string" ? claims.actor : "";
  const runId = typeof claims.run_id === "string" ? claims.run_id : "";
  const expectedWorkflowRef = `${expectedRepository}/${GITHUB_DEPLOY_WORKFLOW}@refs/heads/main`;
  if (
    repository !== expectedRepository ||
    claims.ref !== "refs/heads/main" ||
    claims.event_name !== "push" ||
    claims.workflow_ref !== expectedWorkflowRef ||
    claims.sub !== `repo:${expectedRepository}:ref:refs/heads/main` ||
    !/^[0-9a-f]{40}$/.test(revision) ||
    !actor ||
    !runId
  ) {
    throw new Error("githubDeployIdentityRejected");
  }
  return { repository, revision, actor, runId };
}

export async function verifyGitHubPushIdentity(
  token: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<GitHubPushIdentity> {
  const expectedRepository = resolveDeploymentRepository(env);
  if (!expectedRepository) throw new Error("githubDeployNotConfigured");
  try {
    const { payload } = await jwtVerify(token, githubKeys, {
      issuer: ISSUER,
      audience: GITHUB_DEPLOY_AUDIENCE,
    });
    return validateGitHubPushClaims(payload, expectedRepository);
  } catch (error) {
    if (error instanceof Error && error.message === "githubDeployIdentityRejected") throw error;
    throw new Error("githubDeployIdentityRejected");
  }
}
