import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  isUiUid,
  renderUiDescriptorProp,
  validateUiRegistryPendingRequest,
  type UiRegistryPendingRequest,
} from "@asol/ui-registry-core";

import { resolvePendingSource } from "./pending-source-resolver";

/**
 * The queue operations the runner needs, so tests can drive it with a fake and
 * the CLI can hand it the real data-core repository.
 */
export interface PendingQueuePort {
  listOpen(): Promise<UiRegistryPendingRequest[]>;
  markResolved(id: string): Promise<void>;
  markBlocked(id: string, reason: string): Promise<void>;
}

export interface ApplyOutcome {
  request: UiRegistryPendingRequest;
  applied: boolean;
  /** Where it was written, or why it could not be. */
  detail: string;
}

export interface ApplyPendingResult {
  outcomes: ApplyOutcome[];
  applied: number;
  blocked: number;
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) {
      return entry === "node_modules" ? [] : sourceFiles(full);
    }
    return /\.tsx?$/.test(entry) ? [full] : [];
  });
}

/** Every uid already written into source, so a queued one cannot collide. */
export function declaredUids(root: string): Set<string> {
  const uids = new Set<string>();
  for (const directory of [join(root, "src"), join(root, "packages")]) {
    for (const file of sourceFiles(directory)) {
      for (const match of readFileSync(file, "utf8").matchAll(/\buid:\s*["']([^"']+)["']/g)) {
        uids.add(match[1]!);
      }
    }
  }
  return uids;
}

/**
 * Validates one queued request and, only when everything is proven, writes it.
 *
 * "Proven" means all of: the uid is a real generated uid, no source already
 * uses it, the descriptor still passes the same package validator that guarded
 * the submission, and exactly one usage site in the working tree matches the
 * locator. Anything short of that leaves the row open with the reason, because
 * a tool that edits source on a guess is worse than one that stops.
 */
export function applyPendingRequest(
  request: UiRegistryPendingRequest,
  uids: Set<string>,
  root: string,
): ApplyOutcome {
  if (!isUiUid(request.uid)) {
    return { request, applied: false, detail: `uid "${request.uid}" is not a generated UiRegistry uid` };
  }
  if (uids.has(request.uid)) {
    return { request, applied: false, detail: `uid "${request.uid}" is already used in source` };
  }
  const revalidated = validateUiRegistryPendingRequest({
    uid: request.uid,
    descriptor: request.descriptor,
    locator: request.locator,
  });
  if (!revalidated.ok) {
    return { request, applied: false, detail: `stored request is unsafe: ${revalidated.reason}` };
  }

  const resolution = resolvePendingSource(request, root);
  if (!resolution.ok) return { request, applied: false, detail: resolution.reason };

  const file = join(root, resolution.source.file);
  const source = readFileSync(file, "utf8");
  const tagEnd = resolution.source.index + `<${resolution.source.component}`.length;
  const descriptorProp = renderUiDescriptorProp(
    request.descriptor as unknown as Record<string, unknown>,
  );
  writeFileSync(file, source.slice(0, tagEnd) + descriptorProp + source.slice(tagEnd), "utf8");
  uids.add(request.uid);
  return {
    request,
    applied: true,
    detail: `${resolution.source.file}:${resolution.source.line} <${resolution.source.component}>`,
  };
}

/**
 * Applies every open request it can prove, and records the rest.
 *
 * A request is marked resolved only after its source edit succeeded; a blocked
 * one keeps its row and gains a reason, so the deploy gate still refuses and
 * the next run reports the same actionable diagnosis.
 */
export async function applyPendingRequests(
  queue: PendingQueuePort,
  root: string,
): Promise<ApplyPendingResult> {
  const open = await queue.listOpen();
  const uids = declaredUids(root);
  const outcomes = open.map((request) => applyPendingRequest(request, uids, root));

  for (const outcome of outcomes) {
    if (outcome.applied) await queue.markResolved(outcome.request.id);
    else await queue.markBlocked(outcome.request.id, outcome.detail);
  }

  return {
    outcomes,
    applied: outcomes.filter((outcome) => outcome.applied).length,
    blocked: outcomes.filter((outcome) => !outcome.applied).length,
  };
}
