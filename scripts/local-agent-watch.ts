import { existsSync, watch, type FSWatcher } from "node:fs";
import path from "node:path";

import { listActiveJobs, listRunners, hasGithubToken } from "./local-agent/github-api";
import { agentsDir, coordinationDir, locksDir, messagesDir, operationLogsDir, requestsDir } from "./local-agent/paths";
import { EMPTY_GITHUB_SAMPLE, buildWatchModel, type GithubSample } from "./local-agent/watch-model";
import { PANEL_ORDER, renderFrame, type PanelKey } from "./local-agent/watch-render";

/**
 * A live view of the local server that never touches it.
 *
 * The monitor is a reader and nothing else: it takes no lock, registers no
 * agent, refreshes no heartbeat, writes no record, and dispatches no job, so it
 * can never appear in the state it reports or compete with the agents it is
 * watching. Local changes arrive through inotify rather than polling, so an idle
 * pool costs an idle process; GitHub is asked on a slow timer with conditional
 * requests, so an unchanged answer costs no rate-limit budget.
 *
 *   npm run local-agent:watch                 live, in this terminal
 *   npm run local-agent:watch -- --once       print one frame and exit
 *   npm run local-agent:watch -- --offline    local sources only, zero network
 *   npm run local-agent:watch:window          open it in its own window
 */

const DEFAULT_GITHUB_INTERVAL_MS = 15_000;
const LOCAL_COALESCE_MS = 150;
const FALLBACK_POLL_MS = 3_000;

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.slice(2).find((item) => item.startsWith(prefix))?.slice(prefix.length);
}

function argFlag(name: string): boolean {
  return process.argv.slice(2).includes(`--${name}`);
}

const once = argFlag("once");
const requestedInterval = Number(argValue("github-interval") ?? DEFAULT_GITHUB_INTERVAL_MS);
const githubIntervalMs = Number.isFinite(requestedInterval) && requestedInterval >= 5_000
  ? requestedInterval
  : DEFAULT_GITHUB_INTERVAL_MS;

const state = {
  github: EMPTY_GITHUB_SAMPLE as GithubSample,
  githubEnabled: !argFlag("offline") && hasGithubToken(),
  paused: false,
  focus: null as PanelKey | null,
  color: !argFlag("no-color") && process.stdout.isTTY === true,
  dirty: true,
};

function frame(): string {
  const model = buildWatchModel(state.githubEnabled ? state.github : EMPTY_GITHUB_SAMPLE);
  return renderFrame(model, {
    width: process.stdout.columns || 120,
    height: process.stdout.rows || 40,
    color: state.color,
    paused: state.paused,
    focus: state.focus,
  });
}

function draw(): void {
  if (state.paused) return;
  state.dirty = false;
  // Home the cursor and clear forward rather than clearing the whole screen:
  // a full clear makes the frame flicker on every repaint.
  process.stdout.write(`\u001B[H\u001B[0J${frame()}\u001B[0J`);
}

async function pollGithub(): Promise<void> {
  if (!state.githubEnabled || state.paused) return;
  try {
    const [runners, jobs] = await Promise.all([listRunners(true), listActiveJobs(true)]);
    state.github = {
      runners: runners.runners,
      jobs: jobs.jobs,
      error: runners.error ?? jobs.error,
      polledAt: Date.now(),
    };
  } catch (error) {
    state.github = {
      ...state.github,
      error: error instanceof Error ? error.message : String(error),
      polledAt: Date.now(),
    };
  }
  state.dirty = true;
}

/**
 * Watch the coordination directory for change.
 *
 * inotify is the whole reason this is cheap: nothing is read until something
 * actually happens. Where a watch cannot be established — an exotic filesystem,
 * an exhausted watch limit — the caller's slow interval still repaints, so the
 * monitor degrades instead of going blind.
 */
function watchLocalSources(onChange: () => void): FSWatcher[] {
  const watchers: FSWatcher[] = [];
  const targets = [coordinationDir(), agentsDir(), locksDir(), messagesDir(), requestsDir(), operationLogsDir()];
  for (const target of targets) {
    if (!existsSync(target)) continue;
    try {
      watchers.push(watch(target, { persistent: true }, () => onChange()));
    } catch {
      // A missing watch is not fatal; the repaint interval covers it.
    }
  }
  // The coordination subdirectories are created lazily, so watch the parent for
  // their arrival and pick them up without a restart.
  const parent = path.dirname(coordinationDir());
  if (existsSync(parent)) {
    try {
      watchers.push(watch(parent, { persistent: true }, () => onChange()));
    } catch {
      // Same as above.
    }
  }
  return watchers;
}

function bindKeys(quit: () => void): void {
  if (!process.stdin.isTTY) return;
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (key: string) => {
    if (key === "q" || key === "\u0003") return quit();
    if (key === "p") state.paused = !state.paused;
    else if (key === "o") state.githubEnabled = !state.githubEnabled && hasGithubToken();
    else if (key === "\u001B") state.focus = null;
    else if (key >= "1" && key <= String(PANEL_ORDER.length)) state.focus = PANEL_ORDER[Number(key) - 1] ?? null;
    else return;
    state.dirty = true;
    if (!state.paused) draw();
    else process.stdout.write(`\u001B[H\u001B[0J${frame()}\u001B[0J`);
  });
}

async function main(): Promise<void> {
  if (once) {
    if (state.githubEnabled) await pollGithub();
    console.log(frame());
    return;
  }

  let coalesce: NodeJS.Timeout | null = null;
  const onLocalChange = (): void => {
    if (coalesce) return;
    coalesce = setTimeout(() => {
      coalesce = null;
      state.dirty = true;
      draw();
    }, LOCAL_COALESCE_MS);
  };

  const watchers = watchLocalSources(onLocalChange);
  const repaint = setInterval(() => {
    // Elapsed timers keep moving even when nothing on disk changed.
    state.dirty = true;
    draw();
  }, FALLBACK_POLL_MS);
  const githubTimer = setInterval(() => {
    void pollGithub().then(() => {
      if (state.dirty) draw();
    });
  }, githubIntervalMs);

  const quit = (): void => {
    clearInterval(repaint);
    clearInterval(githubTimer);
    for (const watcher of watchers) watcher.close();
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
    process.stdout.write("\u001B[?25h\u001B[2J\u001B[H");
    process.exit(0);
  };

  process.on("SIGINT", quit);
  process.on("SIGTERM", quit);
  process.stdout.on("resize", () => draw());
  bindKeys(quit);

  process.stdout.write("\u001B[2J\u001B[?25l");
  await pollGithub();
  draw();
}

main().catch((error) => {
  process.stdout.write("\u001B[?25h");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
