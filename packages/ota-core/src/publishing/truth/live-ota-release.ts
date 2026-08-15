import { ok, err, type Result } from "../../errors/result";
import { OtaCoreError } from "../../errors/ota-core-error";
import {
  createOtaR2Client,
  getOtaManifestObject,
  otaObjectExists,
} from "../adapters/r2-storage.adapter";
import {
  getOtaPrefix,
  loadOtaEnvironment,
} from "../config/ota-config";

export interface LiveOtaRelease {
  version: string;
  releaseId: string;
  minimumNativeVersion: string;
  publishedAt: string;
}

export async function readLiveOtaRelease(): Promise<Result<LiveOtaRelease | null, OtaCoreError>> {
  try {
    loadOtaEnvironment();
    const client = createOtaR2Client();
    const manifestKey = `${getOtaPrefix()}/manifest.json`;

    const exists = await otaObjectExists(client, manifestKey);
    if (!exists) return ok(null);

    const manifest = await getOtaManifestObject(client, manifestKey);
    return ok({
      version: manifest.version,
      releaseId: manifest.releaseId,
      minimumNativeVersion: manifest.minimumNativeVersion,
      publishedAt: manifest.createdAt,
    });
  } catch (error) {
    return err(
      OtaCoreError.storageError("Failed to read live OTA release manifest from R2", error),
    );
  }
}
