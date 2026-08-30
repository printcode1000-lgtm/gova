import type { WatchModel } from "./watch-model";

/**
 * Rendering of the monitor's frame.
 *
 * A pure function of the model, the terminal size, and whether colour is
 * wanted — which is what makes the monitor testable without a terminal: the
 * same call that paints the screen produces the string a test asserts on.
 */

export interface RenderOptions {
  width: number;
  height: number;
  color: boolean;
  paused: boolean;
  focus: PanelKey | null;
}

export type PanelKey =
  | "runners"
  | "agents"
  | "locks"
  | "running"
  | "finished"
  | "messages"
  | "requests"
  | "hostTools"
  | "remoteHosts";

export const PANEL_ORDER: PanelKey[] = [
  "runners",
  "agents",
  "locks",
  "running",
  "finished",
  "messages",
  "requests",
  "hostTools",
  "remoteHosts",
];

const ANSI = {
  reset: "\u001B[0m",
  dim: "\u001B[2m",
  bold: "\u001B[1m",
  red: "\u001B[31m",
  green: "\u001B[32m",
  yellow: "\u001B[33m",
  blue: "\u001B[34m",
  magenta: "\u001B[35m",
  cyan: "\u001B[36m",
} as const;

type Colour = keyof typeof ANSI;

function paint(text: string, colour: Colour, enabled: boolean): string {
  return enabled ? `${ANSI[colour]}${text}${ANSI.reset}` : text;
}

/** Visible width, ignoring the escape sequences colour adds. */
export function visibleLength(text: string): number {
  return text.replace(/\u001B\[[0-9;]*m/g, "").length;
}

function truncate(text: string, width: number): string {
  if (width <= 0) return "";
  return visibleLength(text) <= width ? text : `${text.slice(0, Math.max(0, width - 1))}…`;
}

function pad(text: string, width: number): string {
  const short = width - visibleLength(text);
  return short > 0 ? text + " ".repeat(short) : truncate(text, width);
}

export function humanDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m${String(seconds % 60).padStart(2, "0")}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h${String(minutes % 60).padStart(2, "0")}m`;
}

function shortSha(sha: string | null): string {
  return sha ? sha.slice(0, 8) : "—";
}

function section(title: string, count: number, options: RenderOptions): string {
  const label = ` ${title} ${count > 0 ? `(${count})` : ""}`.trimEnd();
  const rule = "─".repeat(Math.max(0, options.width - visibleLength(label) - 1));
  return paint(`${label} ${rule}`, "blue", options.color);
}

function livenessColour(liveness: string): Colour {
  if (liveness === "active") return "green";
  return liveness === "idle" ? "yellow" : "red";
}

function statusColour(status: string): Colour {
  if (status === "success") return "green";
  return status === "running" ? "cyan" : "red";
}

/**
 * Memory headroom, shown in the header because it is the pool's real limit.
 *
 * An out-of-memory kill is the failure that takes several jobs down at once, so
 * the number that predicts it belongs where it is seen without looking for it.
 */
function memoryLine(model: WatchModel, options: RenderOptions): string {
  const reading = model.memory.reading;
  if (!reading) return paint("memory: unreadable", "dim", options.color);
  const tight = reading.availableMb < model.memory.floorMb;
  const swapTight = reading.swapTotalMb > 0 && reading.swapFreeMb / reading.swapTotalMb <= 0.1;
  const text =
    `memory ${reading.availableMb}MB free of ${reading.totalMb}MB (floor ${model.memory.floorMb}MB${model.memory.floorReason ? ` ${model.memory.floorReason}` : ""})` +
    (reading.swapTotalMb > 0 ? `   swap ${reading.swapFreeMb}MB of ${reading.swapTotalMb}MB free` : "");
  return paint(text, tight || swapTight ? "red" : "dim", options.color);
}

function renderHeader(model: WatchModel, options: RenderOptions): string[] {
  const online = model.runners.filter((runner) => runner.githubStatus === "online").length;
  const busy = model.runners.filter((runner) => runner.busy).length;
  const queued = model.running.filter((operation) => operation.status === "waiting").length;
  const running = model.running.filter((operation) => operation.status === "running").length;
  const activeAgents = model.agents.filter((agent) => agent.liveness === "active").length;
  const heldLocks = model.locks.length;

  const title = paint("gova local agent monitor", "bold", options.color);
  const clock = new Date(model.sampledAt).toLocaleTimeString();
  const githubState = model.github.enabled
    ? model.github.error
      ? paint("github: error", "red", options.color)
      : paint(`github: ${humanDuration(model.sampledAt - (model.github.lastPolledAt ?? model.sampledAt))} ago`, "dim", options.color)
    : paint("github: offline", "dim", options.color);

  const left = `${title}  ${paint(clock, "dim", options.color)}`;
  const right = `${githubState}${options.paused ? `  ${paint("PAUSED", "yellow", options.color)}` : ""}`;
  const gap = Math.max(1, options.width - visibleLength(left) - visibleLength(right));

  return [
    `${left}${" ".repeat(gap)}${right}`,
    paint(
      `${model.workspace}  ${model.git.branch}@${shortSha(model.git.head)}` +
        `${model.git.behind ? ` (origin/main ${shortSha(model.git.originMain)})` : ""}` +
        `  dirty=${model.git.dirtyCount}  worktrees=${model.worktrees.length}`,
      "dim",
      options.color,
    ),
    paint(
      `runners ${online}/${model.runners.length} online, ${busy} busy   agents ${activeAgents} active/${model.agents.length}   locks ${heldLocks}   running ${running}/${model.memory.budget} queued ${queued}`,
      "dim",
      options.color,
    ),
    memoryLine(model, options),
    "",
  ];
}

function renderRunners(model: WatchModel, options: RenderOptions): string[] {
  const lines = [section("runners", model.runners.length, options)];
  for (const runner of model.runners) {
    const service = runner.serviceActive
      ? paint("up", "green", options.color)
      : paint("DOWN", "red", options.color);
    const remote =
      runner.githubStatus === null
        ? paint("?", "dim", options.color)
        : runner.githubStatus === "online"
          ? paint("online", "green", options.color)
          : paint(runner.githubStatus, "red", options.color);
    const activity = runner.job
      ? paint(
          `${runner.job.workflowName}/${runner.job.jobName} ${humanDuration(
            model.sampledAt - Date.parse(runner.job.startedAt ?? ""),
          )}`,
          "cyan",
          options.color,
        )
      : runner.busy
        ? paint("busy", "yellow", options.color)
        : paint("idle", "dim", options.color);
    lines.push(
      `  ${pad(runner.githubName, 14)} ${pad(service, 4 + (options.color ? 9 : 0))} ${pad(remote, 7 + (options.color ? 9 : 0))} ${truncate(activity, Math.max(10, options.width - 40))}`,
    );
  }
  return lines;
}

function renderAgents(model: WatchModel, options: RenderOptions): string[] {
  const lines = [section("agents", model.agents.length, options)];
  if (model.agents.length === 0) lines.push(paint("  no agent has declared itself", "dim", options.color));
  for (const agent of model.agents) {
    const liveness = paint(agent.liveness, livenessColour(agent.liveness), options.color);
    const detail = `${agent.branch ?? "—"}  ${agent.task || "—"}`;
    lines.push(
      `  ${pad(agent.agentId, 22)} ${pad(agent.origin, 9)} ${pad(liveness, 7 + (options.color ? 9 : 0))} ` +
        `${pad(humanDuration(agent.heartbeatAgeMs), 7)} ${truncate(detail, Math.max(10, options.width - 50))}`,
    );
    if (agent.scopes.length > 0) {
      lines.push(paint(`      scopes: ${truncate(agent.scopes.join(", "), options.width - 14)}`, "dim", options.color));
    }
  }
  return lines;
}

function renderLocks(model: WatchModel, options: RenderOptions): string[] {
  const lines = [section("locks", model.locks.length, options)];
  if (model.locks.length === 0) lines.push(paint("  nothing reserved", "dim", options.color));
  for (const lock of model.locks) {
    const flag = lock.stale ? paint("STALE", "red", options.color) : paint("held", "green", options.color);
    lines.push(
      `  ${pad(`${lock.kind}:${lock.scope}`, 40)} ${pad(lock.agentId, 22)} ${pad(humanDuration(lock.ageMs), 7)} ${flag}`,
    );
  }
  return lines;
}

function renderRunning(model: WatchModel, options: RenderOptions): string[] {
  const lines = [section("in flight", model.running.length, options)];
  if (model.running.length === 0) lines.push(paint("  no mutation running or queued", "dim", options.color));
  for (const operation of model.running) {
    const status = paint(operation.status, operation.status === "waiting" ? "yellow" : "cyan", options.color);
    lines.push(
      `  ${pad(status, 8 + (options.color ? 9 : 0))} ${pad(operation.agentId, 22)} ${pad(operation.targetRef, 34)} ${pad(operation.runnerName ?? "—", 14)} ` +
        `${pad(humanDuration(model.sampledAt - Date.parse(operation.startedAt)), 7)} ${paint(operation.verification, "dim", options.color)}`,
    );
  }
  return lines;
}

function renderFinished(model: WatchModel, options: RenderOptions): string[] {
  const lines = [section("recent operations", model.finished.length, options)];
  if (model.finished.length === 0) lines.push(paint("  nothing has run yet", "dim", options.color));
  for (const operation of model.finished) {
    const status = paint(operation.status, statusColour(operation.status), options.color);
    lines.push(
      `  ${pad(status, 8 + (options.color ? 9 : 0))} ${pad(operation.agentId, 22)} ${pad(operation.targetRef, 34)} ` +
        `${pad(humanDuration(operation.durationMs), 7)} ${shortSha(operation.startingSha)}→${shortSha(operation.resultingSha)} ` +
        `${operation.changedFiles.length} file(s)`,
    );
  }
  return lines;
}

function renderMessages(model: WatchModel, options: RenderOptions): string[] {
  const lines = [section("messages", model.messages.length, options)];
  if (model.messages.length === 0) lines.push(paint("  channel quiet", "dim", options.color));
  for (const message of model.messages) {
    lines.push(
      `  ${pad(`${message.from} → ${message.to}`, 34)} ${pad(message.kind, 18)} ${truncate(message.body, Math.max(10, options.width - 58))}`,
    );
  }
  return lines;
}

function renderRequests(model: WatchModel, options: RenderOptions): string[] {
  const lines = [section("gateway requests", model.requests.length, options)];
  if (model.requests.length === 0) lines.push(paint("  no request has arrived", "dim", options.color));
  for (const request of model.requests) {
    const outcome = paint(
      request.outcome,
      request.outcome === "dispatched" ? "green" : request.outcome === "rejected" || request.outcome === "failed" ? "red" : "yellow",
      options.color,
    );
    lines.push(
      `  ${pad(request.requestId, 34)} ${pad(request.agentId, 22)} ${pad(request.workflow, 24)} ${outcome}`,
    );
  }
  return lines;
}

function renderHostTools(model: WatchModel, options: RenderOptions): string[] {
  const lines = [section("host tools", 1, options)];
  const state = model.hostTools.allowed ? paint("allowed", "yellow", options.color) : paint("excluded", "green", options.color);
  lines.push(`  ${pad(model.hostTools.tool, 14)} ${pad(state, 10 + (options.color ? 9 : 0))} ${truncate(model.hostTools.policyPath, Math.max(10, options.width - 30))}`);
  lines.push(paint(`      shims: ${truncate(model.hostTools.shimDir, Math.max(10, options.width - 14))}`, "dim", options.color));
  return lines;
}

function renderRemoteHosts(model: WatchModel, options: RenderOptions): string[] {
  const lines = [section("remote hosts", model.remoteHosts.length, options)];
  if (model.remoteHosts.length === 0) lines.push(paint("  no cached probes; run the async probe to refresh", "dim", options.color));
  for (const host of model.remoteHosts) {
    const state = paint(host.ok ? "ok" : "down", host.ok ? "green" : "red", options.color);
    const detail = host.ok
      ? `${host.hostname ?? "?"} cpu=${host.nproc ?? "?"} mem=${host.memAvailableMb ?? "?"}/${host.memTotalMb ?? "?"}MB swap=${host.swapFreeMb ?? "?"}MB node=${host.nodeVersion ?? "?"} runners=${host.registeredRunners}`
      : host.error ?? "unreachable";
    lines.push(`  ${pad(host.alias, 18)} ${pad(state, 6 + (options.color ? 9 : 0))} ${truncate(detail, Math.max(10, options.width - 30))}`);
  }
  return lines;
}

const RENDERERS: Record<PanelKey, (model: WatchModel, options: RenderOptions) => string[]> = {
  runners: renderRunners,
  agents: renderAgents,
  locks: renderLocks,
  running: renderRunning,
  finished: renderFinished,
  messages: renderMessages,
  requests: renderRequests,
  hostTools: renderHostTools,
  remoteHosts: renderRemoteHosts,
};

function renderFooter(options: RenderOptions): string {
  const keys = options.focus
    ? `[esc] all panels  [p] ${options.paused ? "resume" : "pause"}  [o] github on/off  [c] copy frame  [a] antigravity  [q] quit`
    : `[1-9] focus panel  [p] ${options.paused ? "resume" : "pause"}  [o] github on/off  [c] copy frame  [a] antigravity  [q] quit`;
  return paint(keys, "dim", options.color);
}

export function renderFrame(model: WatchModel, options: RenderOptions): string {
  const panels = options.focus ? [options.focus] : PANEL_ORDER;
  const body: string[] = [];
  for (const panel of panels) {
    body.push(...RENDERERS[panel](model, options));
    body.push("");
  }

  const header = renderHeader(model, options);
  const footer = renderFooter(options);
  const room = Math.max(1, options.height - header.length - 2);
  const shown = body.slice(0, room);
  const overflow = body.length - shown.length;

  return [
    ...header,
    ...shown.map((line) => truncate(line, options.width)),
    overflow > 0 ? paint(`  … ${overflow} more line(s); widen the window or focus one panel`, "dim", options.color) : "",
    footer,
  ].join("\n");
}
