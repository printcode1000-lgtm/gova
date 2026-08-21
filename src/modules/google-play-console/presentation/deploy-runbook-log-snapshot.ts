import type { DeployTab } from "./DeployRunbookTypes";

export function parseDeployRunbookLogSnapshot(log: string, tab: DeployTab) {
  const lines = log.split(/\r?\n/).filter(Boolean);
  const latest = (pattern: RegExp) => {
    for (let index = lines.length - 1; index >= 0; index -= 1) {
      const match = lines[index]?.match(pattern);
      if (match?.[1]) return match[1];
    }
    return "";
  };
  const deployAllPhase = latest(/\[deploy:all\]\s+── phase: ([^ ]+) ──/);
  const deployAllSection = latest(/\[deploy:all\] Preflight section: (.+)$/);
  const deployAllBranch = latest(/\[deploy:all\] branch ([^:]+): ([^—]+)(?: — .*)?$/);
  const deployAllStarted = latest(/\[deploy:all\] Starting ([^.\r\n]+)\.\.\./);
  const deployPushStarted = latest(/\[deploy:push\] Starting ([^.\r\n]+)\.\.\./);
  const deployPushTarget = latest(/\[deploy:push\] Service targets: ([^(]+)\(/);
  const pushStep = latest(
    /\[deploy:push\] (Pushing main to GitHub|Verifying origin\/main matches the pushed commit)$/,
  );
  return {
    commandFamily: tab === "deploy-all" ? "deploy:all" : "deploy:push",
    phase:
      tab === "deploy-all"
        ? deployAllPhase || "بانتظار بدء المرحلة"
        : deployPushTarget || "fast publish",
    section: tab === "deploy-all" ? deployAllSection || "—" : "push / Vercel",
    branch:
      deployAllBranch ||
      deployAllStarted ||
      deployPushStarted ||
      pushStep ||
      "بانتظار بدء الأمر",
  };
}
