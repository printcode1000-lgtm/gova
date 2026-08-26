import type {
  RemoteDeployAllSnapshot,
  RemoteDeployAllStage,
} from "@asol/vercel-deploy-core/remote-deploy-contracts";

/**
 * How long the release, and each of its stages, has been running.
 *
 * Every reading comes from timestamps the sandbox wrote, never from a timer the
 * page started: the console is opened, closed, and reopened during a release,
 * and a duration that restarts with the page is worse than no duration at all.
 * `now` is passed in so the caller owns the ticking and this stays pure.
 */

export interface StageTiming {
  stage: RemoteDeployAllStage;
  elapsedMs: number;
  running: boolean;
}

function parse(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Never negative: the sandbox clock and the browser clock are not the same clock. */
function span(fromMs: number, toMs: number): number {
  return Math.max(0, toMs - fromMs);
}

export function deployElapsedMs(snapshot: RemoteDeployAllSnapshot, nowMs: number): number | null {
  const startedAt = parse(snapshot.startedAt);
  if (startedAt === null) return null;
  return span(startedAt, parse(snapshot.finishedAt) ?? nowMs);
}

export function stageTimings(
  snapshot: RemoteDeployAllSnapshot,
  nowMs: number,
): Map<RemoteDeployAllStage, StageTiming> {
  const timings = new Map<RemoteDeployAllStage, StageTiming>();
  for (const entry of snapshot.stageHistory ?? []) {
    const startedAt = parse(entry.startedAt);
    if (startedAt === null) continue;
    const finishedAt = parse(entry.finishedAt);
    const previous = timings.get(entry.stage);
    // A phase can be entered twice across a retried run; report the total.
    const elapsedMs =
      (previous?.elapsedMs ?? 0) + span(startedAt, finishedAt ?? nowMs);
    timings.set(entry.stage, {
      stage: entry.stage,
      elapsedMs,
      running: finishedAt === null,
    });
  }
  return timings;
}

/** `h:mm:ss` once past an hour, `m:ss` before it. Digits stay ASCII for alignment. */
export function formatDeployDuration(elapsedMs: number): string {
  const totalSeconds = Math.floor(Math.max(0, elapsedMs) / 1000);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);
  const pad = (value: number) => String(value).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}
