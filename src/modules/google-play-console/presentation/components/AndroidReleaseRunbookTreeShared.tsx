"use client";

import type { BuildJobRecord } from "@asol/release-core/console";

export type AndroidRunbookStart = (input: {
  commandId: string;
  parameters?: Record<string, unknown>;
}) => Promise<unknown>;

export type AndroidRunbookTreeContext = {
  selected: Set<string>;
  onToggleBranch: (id: string) => void;
  onToggleMany: (ids: readonly string[], enable: boolean) => void;
  t: (key: string, params?: Record<string, string>) => string;
  busy: boolean;
  cancel: (job: BuildJobRecord) => Promise<unknown>;
  jobs: readonly BuildJobRecord[];
  missingEnvOf: (commandId: string) => readonly string[];
  start: AndroidRunbookStart;
};

export function selectionState(ids: readonly string[], selected: Set<string>) {
  const active = ids.filter((id) => selected.has(id)).length;
  return {
    active,
    all: active === ids.length && ids.length > 0,
    some: active > 0 && active < ids.length,
  };
}
