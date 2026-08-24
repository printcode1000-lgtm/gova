"use client";

import type { NotificationEntity } from "@asol/notifications-core";
import { notificationLog } from "../../domain/notification-redaction";

/**
 * The one way another feature attaches behaviour to the notification centre.
 *
 * It exists so the module never imports a consumer. Specialty chat needs to
 * turn a stored receipt card into a delivery mark on the message it refers to,
 * and to acknowledge a card it has just shown; before this port that logic sat
 * inside `use-notifications`, which made notifications and specialty chat import
 * each other. The dependency now points one way: the consumer registers, the
 * module calls back.
 *
 * Every hook is optional and every hook is best-effort — an extension that
 * throws must never stop the centre from rendering.
 */
export interface NotificationCenterExtension {
  /** Stable identifier; registering the same id twice replaces the first. */
  readonly id: string;
  /**
   * Runs after the centre loads a list and before it is shown, so an extension
   * can fold transient cards into the items they describe. Return `true` when
   * the stored list was changed and must be re-read.
   */
  reconcile?(context: NotificationCenterExtensionContext): Promise<boolean> | boolean;
  /** Runs after the user reads notifications. */
  onRead?(context: NotificationCenterExtensionContext): Promise<void> | void;
  /**
   * Replays one operation the device could not send while offline.
   *
   * @returns `true` when this extension owns the operation. An operation no
   * extension claims is dropped rather than queued forever.
   */
  replayQueuedOperation?(operation: {
    kind: string;
    payload: unknown;
  }): Promise<boolean> | boolean;
}

export interface NotificationCenterExtensionContext {
  readonly uid: string;
  readonly notifications: readonly NotificationEntity[];
}

const extensions = new Map<string, NotificationCenterExtension>();

export function registerNotificationCenterExtension(
  extension: NotificationCenterExtension,
): () => void {
  extensions.set(extension.id, extension);
  return () => {
    if (extensions.get(extension.id) === extension) extensions.delete(extension.id);
  };
}

export function listNotificationCenterExtensions(): NotificationCenterExtension[] {
  return [...extensions.values()];
}

/** @returns whether any extension reported that it changed stored notifications. */
export async function runNotificationCenterReconcilers(
  context: NotificationCenterExtensionContext,
): Promise<boolean> {
  let changed = false;
  for (const extension of listNotificationCenterExtensions()) {
    if (!extension.reconcile) continue;
    try {
      if (await extension.reconcile(context)) changed = true;
    } catch (error) {
      notificationLog.warn(`Extension "${extension.id}" failed to reconcile.`, error);
    }
  }
  return changed;
}

/**
 * Offer a queued operation to each extension until one claims it.
 *
 * Errors are not swallowed here: a replay that fails must count as a failed
 * attempt so the queue can retry it, which is the sync service's decision.
 *
 * @returns whether any extension owns this operation.
 */
export async function replayQueuedOperationWithExtensions(operation: {
  kind: string;
  payload: unknown;
}): Promise<boolean> {
  for (const extension of listNotificationCenterExtensions()) {
    if (!extension.replayQueuedOperation) continue;
    if (await extension.replayQueuedOperation(operation)) return true;
  }
  return false;
}

export async function runNotificationCenterReadHandlers(
  context: NotificationCenterExtensionContext,
): Promise<void> {
  for (const extension of listNotificationCenterExtensions()) {
    if (!extension.onRead) continue;
    try {
      await extension.onRead(context);
    } catch (error) {
      notificationLog.warn(`Extension "${extension.id}" failed on read.`, error);
    }
  }
}
