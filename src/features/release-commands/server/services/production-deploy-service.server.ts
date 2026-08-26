import "server-only";

import { timingSafeEqual } from "node:crypto";

import {
  REMOTE_DEPLOY_ALL_CONFIRMATION,
  isRemoteDeployAllTerminal,
  type RemoteDeployAllCallbackInput,
  type RemoteDeployAllResult,
} from "@asol/vercel-deploy-core/remote-deploy-contracts";
import {
  getRemoteDeployAllResult,
  recordRemoteDeployAllNotification,
  remoteDeployAllReadiness,
  startRemoteDeployAll,
} from "@asol/vercel-deploy-core/remote-deploy-sandbox";

import { getProductionDeployCallbackSecret } from "@/core/config/server-env";
import { notificationsServer } from "@/features/notifications/server";
import {
  productionDeployEmail,
  productionDeployNotification,
} from "@/features/release-commands/domain/production-deploy-report";
import { sendProductionDeployEmail } from "@/features/release-commands/server/services/production-deploy-email.server";

/**
 * The super admin's production entry point to `deploy:all`.
 *
 * Nothing here deploys. The release still runs exactly one way — `deploy:all`
 * from a clean `main` checkout — only now the checkout lives in a Vercel
 * Sandbox that this service starts, watches, and reports on. Deployment
 * credentials never leave that sandbox: it restores them itself from the
 * encrypted archive, and the only secret the application holds is the archive
 * password, which is passed straight into the sandbox command and never
 * returned to a caller or written to a log.
 */

function translateSandboxError(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  if (message === "remoteDeployAllAlreadyRunning") {
    throw new Error("productionDeployAlreadyRunning");
  }
  if (message === "remoteDeployAllNotConfigured") {
    throw new Error("productionDeployNotConfigured");
  }
  throw error instanceof Error ? error : new Error(message);
}

function secretsMatch(provided: string, expected: string): boolean {
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * Read the run, and notify in-app exactly once when it has finished.
 *
 * The application cannot push a notification by itself — it issues a signed
 * grant the console's own browser delivers — so the terminal notification is
 * raised on the first poll that observes it, and the sandbox records that it
 * happened so a second console session does not repeat it.
 */
export async function getProductionDeployStatus(adminUid: string): Promise<RemoteDeployAllResult> {
  const result = await getRemoteDeployAllResult().catch(translateSandboxError);
  const { snapshot } = result;
  if (
    !snapshot.requestId ||
    snapshot.inAppNotified ||
    !isRemoteDeployAllTerminal(snapshot.status)
  ) {
    return result;
  }

  const grants = notificationsServer.createGrantIssuer(adminUid);
  const issued = grants.issue(
    productionDeployNotification({ snapshot, uids: [snapshot.initiatedByUid ?? adminUid] }),
  );
  if (issued) {
    await recordRemoteDeployAllNotification({
      requestId: snapshot.requestId,
      inAppNotified: true,
    }).catch((error) => {
      console.error("Failed to record the production deploy in-app notification.", error);
    });
  }
  return notificationsServer.attachGrants(
    { ...result, snapshot: { ...snapshot, inAppNotified: issued || snapshot.inAppNotified } },
    grants.toArray(),
  );
}

export async function startProductionDeploy(input: {
  adminUid: string;
  confirmation: string;
  callbackUrl: string;
}): Promise<RemoteDeployAllResult> {
  if (input.confirmation?.trim() !== REMOTE_DEPLOY_ALL_CONFIRMATION) {
    throw new Error("productionDeployConfirmationRequired");
  }
  if (!remoteDeployAllReadiness().ready) throw new Error("productionDeployNotConfigured");

  return startRemoteDeployAll({
    initiatedByUid: input.adminUid,
    callbackUrl: input.callbackUrl,
  }).catch(translateSandboxError);
}

/**
 * Terminal report from the sandbox runner.
 *
 * The email is sent from here rather than from the poll: a release that ends
 * while nobody is watching the console must still reach the release mailbox.
 */
export async function handleProductionDeployCallback(input: {
  providedSecret: string | null;
  payload: RemoteDeployAllCallbackInput;
}): Promise<{ received: true }> {
  const expected = getProductionDeployCallbackSecret();
  if (!expected) throw new Error("productionDeployNotConfigured");
  if (!input.providedSecret || !secretsMatch(input.providedSecret, expected)) {
    throw new Error("productionDeployCallbackRejected");
  }

  const snapshot = input.payload?.snapshot;
  if (!snapshot?.requestId || !isRemoteDeployAllTerminal(snapshot.status)) {
    return { received: true };
  }
  if (snapshot.emailStatus === "sent") return { received: true };

  try {
    await sendProductionDeployEmail(
      productionDeployEmail({ snapshot, logTail: input.payload.logTail ?? "" }),
    );
    await recordRemoteDeployAllNotification({
      requestId: snapshot.requestId,
      emailStatus: "sent",
    });
  } catch (error) {
    await recordRemoteDeployAllNotification({
      requestId: snapshot.requestId,
      emailStatus: "failed",
      emailError: (error instanceof Error ? error.message : String(error)).slice(0, 500),
    }).catch((recordError) => {
      console.error("Failed to record the production deploy email failure.", recordError);
    });
  }
  return { received: true };
}
