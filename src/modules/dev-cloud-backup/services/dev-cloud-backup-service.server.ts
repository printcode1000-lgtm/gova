import "server-only";

import { DevCloudBackupService } from "@asol/backup-core/server";
import { tursoBackupRepository } from "@asol/data-core/dev-cloud-backup";

import {
  assertDevCloudBackupAllowed,
  devCloudBackupEnvironment,
} from "../domain/development-guard.server";

/** The only application seam that knows both the backup capability and the database adapter. */
export const devCloudBackupService = new DevCloudBackupService({
  assertAllowed: assertDevCloudBackupAllowed,
  environment: devCloudBackupEnvironment,
  database: tursoBackupRepository,
});
