import type {
  DataHealthCleanupPlanRecordDto,
  DataHealthOrderPurgePlanRecordDto,
  DataHealthQuarantineRecordDto,
  DataHealthStorageDeletionTaskDto,
} from "@asol/data-health-core";

type Row = Record<string, unknown>;

const text = (value: unknown) => String(value ?? "");
const numberValue = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function mapDataHealthQuarantineRow(row: Row): DataHealthQuarantineRecordDto {
  return {
    id: text(row.id), fingerprint: text(row.fingerprint), resourceType: text(row.resource_type),
    storageProfileId: text(row.storage_profile_id), resourceKey: text(row.resource_key),
    databaseName: text(row.database_name), tableName: text(row.table_name), recordId: text(row.record_id),
    eligibleForDeletionAt: text(row.eligible_for_deletion_at), releasedAt: text(row.released_at),
    deletedAt: text(row.deleted_at),
  };
}
export function mapDataHealthCleanupPlanRow(row: Row): DataHealthCleanupPlanRecordDto {
  return {
    id: text(row.id), adminUid: text(row.admin_uid), environment: text(row.environment),
    issueIdsJson: text(row.issue_ids_json), snapshotsJson: text(row.snapshots_json),
    expiresAt: text(row.expires_at), consumedAt: text(row.consumed_at),
  };
}

export function mapOrderPurgePlanRow(row: Row): DataHealthOrderPurgePlanRecordDto {
  return {
    id: text(row.id), adminUid: text(row.admin_uid), environment: text(row.environment),
    orderCount: numberValue(row.order_count), tableCountsJson: text(row.table_counts_json),
    imagesJson: text(row.images_json), snapshotHash: text(row.snapshot_hash),
    confirmationText: text(row.confirmation_text), createdAt: text(row.created_at),
    expiresAt: text(row.expires_at), consumedAt: text(row.consumed_at),
    status: text(row.status), errorMessage: text(row.error_message),
  };
}
export function mapStorageDeletionTaskRow(row: Row): DataHealthStorageDeletionTaskDto {
  return {
    id: text(row.id), purgeId: text(row.purge_id), storageProfileId: text(row.storage_profile_id),
    imageKey: text(row.image_key), status: text(row.status), attempts: numberValue(row.attempts),
    lastError: text(row.last_error), createdAt: text(row.created_at), updatedAt: text(row.updated_at),
    deletedAt: text(row.deleted_at),
  };
}
