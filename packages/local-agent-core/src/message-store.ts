import { randomUUID } from "node:crypto";
import path from "node:path";

import { listJsonFiles, readJsonFile, safeIdentifier, writeJsonFile } from "./json-store";
import { messagesDir } from "./paths";
import { looksLikeSecretValue } from "./secret-paths";

/**
 * Short coordination notes between agents.
 *
 * The channel is deliberately small: an agent announces what it is touching,
 * warns another agent off a path, reports a conflict, or says a lock is free.
 * Anything resembling a credential is refused so the channel can be republished
 * to GitHub for cloud agents to read.
 */

export const MESSAGE_KINDS = [
  "editing",
  "do-not-modify",
  "dependency-changed",
  "ready-for-merge",
  "conflict-detected",
  "lock-released",
  "note",
] as const;

export type MessageKind = (typeof MESSAGE_KINDS)[number];

export const MAX_MESSAGE_BODY = 500;
export const DEFAULT_MESSAGE_LIMIT = 100;

export interface MessageRecord {
  messageId: string;
  from: string;
  to: string;
  kind: MessageKind;
  body: string;
  scope: string | null;
  createdAt: string;
}

export function isMessageKind(value: string): value is MessageKind {
  return (MESSAGE_KINDS as readonly string[]).includes(value);
}

export interface PostMessageInput {
  from: string;
  to?: string;
  kind: string;
  body: string;
  scope?: string | null;
}

export function postMessage(input: PostMessageInput, now = Date.now()): MessageRecord {
  if (!isMessageKind(input.kind)) {
    throw new Error(`Unsupported message kind: ${input.kind}. Allowed: ${MESSAGE_KINDS.join(", ")}.`);
  }
  const body = input.body.trim();
  if (!body) throw new Error("Message body must not be empty.");
  if (body.length > MAX_MESSAGE_BODY) {
    throw new Error(`Message body must be at most ${MAX_MESSAGE_BODY} characters.`);
  }
  if (looksLikeSecretValue(body)) throw new Error("Message body looks like it carries a secret; refusing to store it.");

  const createdAt = new Date(now).toISOString();
  const record: MessageRecord = {
    messageId: `${createdAt.replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`,
    from: safeIdentifier(input.from, 48) || "agent",
    to: safeIdentifier(input.to || "all", 48) || "all",
    kind: input.kind,
    body,
    scope: input.scope?.trim() || null,
    createdAt,
  };
  writeJsonFile(path.join(messagesDir(), `${record.messageId}.json`), record);
  return record;
}

/** Newest messages first, optionally narrowed to one recipient (plus broadcasts). */
export function listMessages(options: { to?: string; limit?: number } = {}): MessageRecord[] {
  const limit = options.limit ?? DEFAULT_MESSAGE_LIMIT;
  const recipient = options.to ? safeIdentifier(options.to, 48) : null;
  return listJsonFiles(messagesDir())
    .reverse()
    .map((filePath) => readJsonFile<MessageRecord>(filePath))
    .filter((record): record is MessageRecord => record !== null)
    .filter((record) => !recipient || record.to === recipient || record.to === "all")
    .slice(0, limit);
}
