import type { BuildJobRecord } from "@asol/release-core/console";

export function parseAndroidReleaseLogSnapshot(
  log: string,
  activeJob: BuildJobRecord | undefined,
  t: (key: string, params?: Record<string, string>) => string,
) {
  const lines = log.split(/\r?\n/).filter(Boolean);
  const latest = (pattern: RegExp) => {
    for (let index = lines.length - 1; index >= 0; index -= 1) {
      const match = lines[index]?.match(pattern);
      if (match?.[1]) return match[1];
    }
    return "";
  };

  const announcedStage = latest(/\[stage\]\s+([a-z-]+)/);
  const announcedStep = latest(/\[step\][ \t]*(.+)/);
  const npmStarted = latest(/npm run ([^\s]+)/);

  const commandId = activeJob?.commandId ?? "";
  const stageKey = activeJob?.stage ?? announcedStage;
  const stage = stageKey
    ? t(`releaseConsole.jobStage.${stageKey}`)
    : announcedStage || "—";
  const activity = activeJob?.activity ?? announcedStep;
  const status = activeJob
    ? t(`releaseConsole.jobStatus.${activeJob.status}`)
    : "—";

  return {
    status,
    command: commandId || npmStarted || "—",
    phase: commandId ? t(`releaseConsole.commandDocs.${commandId}.title`) : "—",
    section: stage,
    branch: activity || npmStarted || "—",
  };
}
