import "server-only";

import { randomUUID } from "node:crypto";

import type {
  UiRegistryPendingRequest,
  UiRegistryPendingRequestInput,
  UiRegistryPendingStatus,
} from "@asol/ui-registry-core";

import { profilesDataSource } from "../../../core";
import { UI_REGISTRY_PENDING_STATEMENTS } from "../db/pending-schema";

type Row = Record<string, unknown>;

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toRequest(row: Row): UiRegistryPendingRequest {
  return {
    id: text(row.id),
    uid: text(row.uid),
    descriptor: JSON.parse(text(row.descriptor_json)) as UiRegistryPendingRequest["descriptor"],
    locator: JSON.parse(text(row.locator_json)) as UiRegistryPendingRequest["locator"],
    status: text(row.status) as UiRegistryPendingStatus,
    reason: text(row.reason) === "" ? null : text(row.reason),
    createdAt: text(row.created_at),
    createdBy: text(row.created_by),
    resolvedAt: text(row.resolved_at) === "" ? null : text(row.resolved_at),
  };
}

/**
 * The only writer and reader of the pending queue.
 *
 * Browsers never touch it: the super-admin route calls this on the server, and
 * the `ui-registry:apply-pending` tool calls it from Node with the same data
 * ownership. That is what keeps a static export or a native WebView — neither
 * of which can write a file — able to submit a request at all.
 */
export class UiRegistryPendingRepository {
  private schemaReady = false;

  private async ensureSchema(): Promise<void> {
    if (this.schemaReady) return;
    for (const statement of UI_REGISTRY_PENDING_STATEMENTS) {
      await profilesDataSource.execute(statement);
    }
    this.schemaReady = true;
  }

  /**
   * Records a request, or returns the existing one for the same uid.
   *
   * Re-submitting the same element is normal — a super admin can touch it twice
   * — and must not create a second row that a developer then applies twice.
   */
  async submit(
    input: UiRegistryPendingRequestInput,
    createdBy: string,
  ): Promise<UiRegistryPendingRequest> {
    await this.ensureSchema();
    const existing = await this.findByUid(input.uid);
    if (existing) return existing;

    const request: UiRegistryPendingRequest = {
      id: randomUUID(),
      uid: input.uid,
      descriptor: input.descriptor,
      locator: input.locator,
      status: "pending",
      reason: null,
      createdAt: new Date().toISOString(),
      createdBy,
      resolvedAt: null,
    };
    await profilesDataSource.execute(
      `INSERT INTO ui_registry_pending_requests
        (id, uid, descriptor_json, locator_json, route, status, reason, created_at, created_by, resolved_at)
       VALUES (?, ?, ?, ?, ?, ?, '', ?, ?, '')`,
      [
        request.id,
        request.uid,
        JSON.stringify(request.descriptor),
        JSON.stringify(request.locator),
        request.locator.route,
        request.status,
        request.createdAt,
        request.createdBy,
      ],
    );
    return request;
  }

  async findByUid(uid: string): Promise<UiRegistryPendingRequest | null> {
    await this.ensureSchema();
    const rows = (await profilesDataSource.execute(
      "SELECT * FROM ui_registry_pending_requests WHERE uid = ? LIMIT 1",
      [uid],
    )) as Row[];
    const row = rows[0];
    return row ? toRequest(row) : null;
  }

  /** Every request a developer still has to act on. */
  async listOpen(): Promise<UiRegistryPendingRequest[]> {
    await this.ensureSchema();
    const rows = (await profilesDataSource.execute(
      "SELECT * FROM ui_registry_pending_requests WHERE status <> 'resolved' ORDER BY created_at ASC",
    )) as Row[];
    return rows.map(toRequest);
  }

  async listAll(): Promise<UiRegistryPendingRequest[]> {
    await this.ensureSchema();
    const rows = (await profilesDataSource.execute(
      "SELECT * FROM ui_registry_pending_requests ORDER BY created_at ASC",
    )) as Row[];
    return rows.map(toRequest);
  }

  /** Marks one request applied. Only a proven source edit may call this. */
  async markResolved(id: string): Promise<void> {
    await this.ensureSchema();
    await profilesDataSource.execute(
      "UPDATE ui_registry_pending_requests SET status = 'resolved', reason = '', resolved_at = ? WHERE id = ?",
      [new Date().toISOString(), id],
    );
  }

  /** Keeps a request open and records why it could not be applied. */
  async markBlocked(id: string, reason: string): Promise<void> {
    await this.ensureSchema();
    await profilesDataSource.execute(
      "UPDATE ui_registry_pending_requests SET status = 'blocked', reason = ? WHERE id = ?",
      [reason, id],
    );
  }
}

export const uiRegistryPendingRepository = new UiRegistryPendingRepository();
