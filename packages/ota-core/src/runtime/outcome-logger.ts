/** Single responsibility: durably batch privacy-safe OTA lifecycle outcomes. */
"use client";

import {
  asolDbGet,
  asolDbSet,
  ASOL_DB_STORES,
} from "@asol/data-core/browser";
import { getPlatformName } from '@asol/native-core';
import { otaTelemetry, type OtaLogEntry } from "../ports";

export type OtaOutcome =
  | "check_performed"
  | "update_discovered"
  | "download_started"
  | "download_failed"
  | "verification_failed"
  | "activation_succeeded"
  | "activation_failed"
  | "rollback_performed"
  | "revocation_applied"
  /** The release was accepted while one of its optional capabilities is absent. */
  | "optional_capabilities_missing";

interface QueuedOutcome {
  key: string;
  outcome: OtaOutcome;
  localVersion: string;
  targetVersion: string;
  reason?: string;
  platform: "web" | "android" | "ios";
}

interface OtaOutcomeQueue {
  pending: QueuedOutcome[];
  sent: string[];
}

const QUEUE_KEY = "asol-ota-outcome-queue-v1";
let serialized = Promise.resolve();

async function readQueue(): Promise<OtaOutcomeQueue> {
  try {
    const value = await asolDbGet<Partial<OtaOutcomeQueue>>(
      ASOL_DB_STORES.APP_SETTINGS,
      QUEUE_KEY,
    );
    return {
      pending: Array.isArray(value?.pending) ? value.pending.slice(-200) : [],
      sent: Array.isArray(value?.sent) ? value.sent.slice(-500) : [],
    };
  } catch {
    return { pending: [], sent: [] };
  }
}

function persistentInput(event: QueuedOutcome): OtaLogEntry {
  const failure = event.outcome.endsWith("failed");
  return {
    level: failure ? "warning" : "normal",
    source: "client",
    consoleMethod: failure ? "ota.warning" : "ota.info",
    message: `local=${event.localVersion};target=${event.targetVersion};platform=${event.platform};reason=${event.reason ?? "none"}`,
    page: "ota",
    platform: event.platform,
    feature: "ota",
    operation: event.outcome,
    appVersion: event.localVersion,
  };
}

async function enqueueAndFlush(event: QueuedOutcome): Promise<void> {
  const queue = await readQueue();
  if (queue.sent.includes(event.key) || queue.pending.some((item) => item.key === event.key)) return;
  queue.pending.push(event);
  await asolDbSet(ASOL_DB_STORES.APP_SETTINGS, QUEUE_KEY, queue);
  try {
    await otaTelemetry().ingestBatch(queue.pending.map(persistentInput));
    queue.sent = [...queue.sent, ...queue.pending.map((item) => item.key)].slice(-500);
    queue.pending = [];
    await asolDbSet(ASOL_DB_STORES.APP_SETTINGS, QUEUE_KEY, queue);
  } catch {
    // Telemetry never participates in OTA correctness or latency decisions.
  }
}

export function recordOtaOutcome(input: {
  outcome: OtaOutcome;
  localVersion: string;
  targetVersion: string;
  releaseId?: string;
  reason?: string;
}): void {
  if (typeof window === "undefined") return;
  const event: QueuedOutcome = {
    key: `${input.releaseId ?? input.targetVersion}:${input.outcome}`,
    outcome: input.outcome,
    localVersion: input.localVersion,
    targetVersion: input.targetVersion,
    reason: input.reason,
    platform: getPlatformName(),
  };
  serialized = serialized.then(() => enqueueAndFlush(event)).catch((error) => {
    console.warn("[AsolOTA] Outcome queue operation failed", error);
  });
}

export function otaFailureReason(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (/checksum|hash|signature/.test(message)) return "verification";
  if (/space|storage|disk/.test(message)) return "storage";
  if (/timeout|network|fetch|request/.test(message)) return "transport";
  return "unknown";
}
