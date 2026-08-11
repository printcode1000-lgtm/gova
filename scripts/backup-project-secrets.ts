import path from "node:path";
import os from "node:os";
import { existsSync } from "node:fs";

import {
  BACKUP_DIRECTORY,
  MANIFEST_FILE_NAME,
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
} from "./secret-archive-utils";
import {
  copyRecoveryKeyBesideArchive,
  encryptZipWithPublicKey,
} from "./secret-archive-crypto";

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
    existsSync(previousState.archivePath) &&
    existsSync(`${previousState.archivePath}.private-key.pem`) &&
    manifestsContainSameFiles(manifest, previousState.manifest)
  ) {
    console.log(
      `No changes detected in ${included.length} secret file(s); no archive was created.`,
    );
    return;
  }
  const manifestPath = await writeTemporaryManifest(manifest);
  const listPath = await createTemporaryListFile([
    ...included,
    MANIFEST_FILE_NAME,
  ]);
  const encryptedArchivePath = path.join(
    BACKUP_DIRECTORY,
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
    const recoveryKey = await copyRecoveryKeyBesideArchive(encryptedArchivePath);
    await writeLastBackupState(manifest, encryptedArchivePath);
    console.log(`Encrypted secret archive created: ${encryptedArchivePath}`);
    console.log(`Encrypted recovery key copied beside it: ${recoveryKey}`);
  } catch (error) {
    await removeTemporaryPath(encryptedArchivePath);
    await removeTemporaryPath(`${encryptedArchivePath}.private-key.pem`);
    throw error;
  } finally {
    await removeTemporaryPath(temporaryZipPath);
    await removeTemporaryPath(manifestPath);
    await removeTemporaryPath(listPath);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
