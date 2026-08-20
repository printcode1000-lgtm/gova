import path from "node:path";
import os from "node:os";
import { existsSync } from "node:fs";
import { copyFile, mkdir } from "node:fs/promises";

import {
  MANIFEST_FILE_NAME,
  PORTABLE_ARCHIVE_PATH,
  PORTABLE_RECOVERY_KEY_PATH,
  collectIgnoredSecretFiles,
  createManifest,
  createTemporaryListFile,
  findSevenZip,
  manifestsContainSameFiles,
  readLastBackupState,
  removeTemporaryPath,
  runSevenZip,
  writeLastBackupState,
  writeTemporaryManifest,
} from "@asol/secrets-core";
import {
  copyRecoveryKeyBesideArchive,
  encryptZipWithPublicKey,
} from "@asol/secrets-core";

async function publishPortableEncryptedBackup(archivePath: string): Promise<void> {
  const recoveryKeyPath = `${archivePath}.private-key.pem`;
  if (!existsSync(archivePath) || !existsSync(recoveryKeyPath)) {
    throw new Error("The encrypted archive or its encrypted recovery key is missing.");
  }
  await mkdir(path.dirname(PORTABLE_ARCHIVE_PATH), { recursive: true });
  await copyFile(archivePath, PORTABLE_ARCHIVE_PATH);
  await copyFile(recoveryKeyPath, PORTABLE_RECOVERY_KEY_PATH);
  console.log(`Portable encrypted backup synchronized: ${PORTABLE_ARCHIVE_PATH}`);
}

function archiveTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function main(): Promise<void> {
  const { included, sensitiveButTracked } = await collectIgnoredSecretFiles();
  if (included.length === 0) {
    throw new Error("No ignored secret files matched the configured backup rules.");
  }

  if (sensitiveButTracked.length > 0) {
    console.warn(
      "Sensitive-looking files already tracked by Git are excluded from this private archive:",
    );
    for (const file of sensitiveButTracked) console.warn(`  - ${file}`);
  }

  const manifest = await createManifest(included);
  const previousState = await readLastBackupState();
  if (
    previousState &&
    existsSync(PORTABLE_ARCHIVE_PATH) &&
    existsSync(PORTABLE_RECOVERY_KEY_PATH) &&
    manifestsContainSameFiles(manifest, previousState.manifest)
  ) {
    await writeLastBackupState(manifest, PORTABLE_ARCHIVE_PATH);
    console.log(
      `No changes detected in ${included.length} secret file(s); the current encrypted backup was kept.`,
    );
    return;
  }
  const manifestPath = await writeTemporaryManifest(manifest);
  const listPath = await createTemporaryListFile([
    ...included,
    MANIFEST_FILE_NAME,
  ]);
  const encryptedArchivePath = path.join(
    os.tmpdir(),
    `asol-secrets-${archiveTimestamp()}.zip.enc`,
  );
  const temporaryZipPath = path.join(
    os.tmpdir(),
    `asol-secrets-${archiveTimestamp()}.zip`,
  );
  const sevenZip = findSevenZip();

  try {
    console.log(`Preparing ${included.length} ignored secret file(s).`);
    runSevenZip(sevenZip, [
      "a",
      "-tzip",
      "-scsUTF-8",
      temporaryZipPath,
      `@${listPath}`,
    ]);
    await encryptZipWithPublicKey(temporaryZipPath, encryptedArchivePath);
    await copyRecoveryKeyBesideArchive(encryptedArchivePath);
    await publishPortableEncryptedBackup(encryptedArchivePath);
    await writeLastBackupState(manifest, PORTABLE_ARCHIVE_PATH);
    console.log(`Current encrypted secret backup updated: ${PORTABLE_ARCHIVE_PATH}`);
    console.log(`Current encrypted recovery key updated: ${PORTABLE_RECOVERY_KEY_PATH}`);
  } catch (error) {
    await removeTemporaryPath(encryptedArchivePath);
    await removeTemporaryPath(`${encryptedArchivePath}.private-key.pem`);
    throw error;
  } finally {
    await removeTemporaryPath(temporaryZipPath);
    await removeTemporaryPath(encryptedArchivePath);
    await removeTemporaryPath(`${encryptedArchivePath}.private-key.pem`);
    await removeTemporaryPath(manifestPath);
    await removeTemporaryPath(listPath);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
