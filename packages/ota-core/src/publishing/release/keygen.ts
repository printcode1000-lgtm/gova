import { generateKeyPairSync } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ok, err, type Result } from "../../errors/result";
import { OtaCoreError } from "../../errors/ota-core-error";
import { getOtaPublicKeyBase64 } from "../config/ota-config";

export interface GeneratedKeys {
  privateKeyPath: string;
  publicKeyPath: string;
  publicKeyBase64: string;
}

export function generateOtaSigningKeys(
  targetDir = path.resolve(".ota"),
): Result<GeneratedKeys, OtaCoreError> {
  try {
    const privateKeyPath = path.join(targetDir, "private-key.pem");
    const publicKeyPath = path.join(targetDir, "public-key.txt");

    if (existsSync(privateKeyPath)) {
      return err(
        OtaCoreError.internal(`Refusing to replace existing key: ${privateKeyPath}`),
      );
    }

    const { privateKey } = generateKeyPairSync("ec", {
      namedCurve: "prime256v1",
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
      publicKeyEncoding: { type: "spki", format: "pem" },
    });

    mkdirSync(targetDir, { recursive: true });
    writeFileSync(privateKeyPath, privateKey, { encoding: "utf8", mode: 0o600 });
    const publicKeyBase64 = getOtaPublicKeyBase64(privateKey);
    writeFileSync(publicKeyPath, publicKeyBase64, "utf8");

    return ok({
      privateKeyPath,
      publicKeyPath,
      publicKeyBase64,
    });
  } catch (error) {
    return err(
      OtaCoreError.internal("Failed to generate OTA signing keys", error),
    );
  }
}
