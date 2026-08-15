import type { S3Client } from "@aws-sdk/client-s3";
import type { OtaRevocationDocument } from "../../domain/release/revocation-document";
import { getOtaObjectBytes, otaObjectExists } from "../adapters/r2-storage.adapter";
import { verifySignedRevocationDocument } from "./revocation";

export async function readVerifiedLiveRevocationDocument(
  client: S3Client,
  key: string,
  privateKey: string,
): Promise<OtaRevocationDocument | null> {
  if (!(await otaObjectExists(client, key))) return null;
  const bytes = await getOtaObjectBytes(client, key);
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(bytes).toString("utf8"));
  } catch (error) {
    throw new Error(`Live OTA revocation document is not valid JSON: ${key}`, {
      cause: error,
    });
  }
  const verified = verifySignedRevocationDocument(value, privateKey);
  if (!verified) {
    throw new Error(
      `Live OTA revocation document failed signature or schema verification: ${key}`,
    );
  }
  return verified;
}
