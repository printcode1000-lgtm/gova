/**
 * Single responsibility: plan changed/deleted OTA files and bounded resumable
 * work independently from storage and networking.
 */
import type {
  OtaFileEntry,
  OtaManifest,
  OtaResumeState,
} from "../types/ota.types";

export interface OtaDeltaPlan {
  changed: string[];
  deleted: string[];
  downloadBytes: number;
}

export function planOtaDelta(
  local: OtaManifest,
  remote: OtaManifest,
): OtaDeltaPlan {
  const changed = Object.entries(remote.files)
    .filter(([path, entry]) => local.files[path]?.sha256 !== entry.sha256)
    .map(([path]) => path);
  const deleted = Object.keys(local.files).filter(
    (path) => !(path in remote.files),
  );
  const downloadBytes = changed.reduce(
    (total, path) => total + remote.files[path]!.size,
    0,
  );
  return { changed, deleted, downloadBytes };
}

export function pendingDeltaFiles(
  plan: OtaDeltaPlan,
  manifest: OtaManifest,
  resume: OtaResumeState | undefined,
): string[] {
  if (
    !resume ||
    resume.releaseId !== manifest.releaseId ||
    resume.version !== manifest.version
  )
    return plan.changed;
  return plan.changed.filter(
    (path) => resume.completed[path] !== manifest.files[path]?.sha256,
  );
}

export async function runBounded<T>(
  values: readonly T[],
  concurrency: number,
  worker: (value: T, index: number) => Promise<void>,
): Promise<void> {
  if (!Number.isSafeInteger(concurrency) || concurrency < 1)
    throw new Error("OTA concurrency must be positive");
  let cursor = 0;
  const runners = Array.from(
    { length: Math.min(concurrency, values.length) },
    async () => {
      while (cursor < values.length) {
        const index = cursor++;
        await worker(values[index]!, index);
      }
    },
  );
  await Promise.all(runners);
}

export function completedFileEntry(
  path: string,
  entry: OtaFileEntry,
): [string, string] {
  return [path, entry.sha256];
}
