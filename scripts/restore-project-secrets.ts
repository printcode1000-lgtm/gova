import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

import {
  BACKUP_DIRECTORY,
  MANIFEST_FILE_NAME,
  type SecretArchiveManifest,
  createRestoreDirectory,
  findSevenZip,
  listArchivePaths,
  removeTemporaryPath,
  restoreManifestFiles,
  runSevenZip,
  writeLastBackupState,
} from "./secret-archive-utils";
import {
  decryptArchiveToZip,
  promptHidden,
} from "./secret-archive-crypto";

async function latestArchive(): Promise<string> {
  const entries = await readdir(BACKUP_DIRECTORY, { withFileTypes: true });
  const archives = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".zip.enc"))
      .map(async (entry) => {
        const absolutePath = path.join(BACKUP_DIRECTORY, entry.name);
        return { absolutePath, modifiedAt: (await stat(absolutePath)).mtimeMs };
      }),
  );
  const latest = archives.sort((a, b) => b.modifiedAt - a.modifiedAt)[0];
  if (!latest) throw new Error("No secret archive exists in .private-backups.");
  return latest.absolutePath;
}

function assertSafeArchiveEntries(entries: string[]): void {
  for (const entry of entries) {
    const normalized = entry.replace(/\\/g, "/");
    if (
      normalized.startsWith("/") ||
      /^[A-Za-z]:\//.test(normalized) ||
      normalized.split("/").includes("..")
    ) {
      throw new Error(`Unsafe path found in archive: ${entry}`);
    }
  }
}

async function main(): Promise<void> {
  const archiveArgument = process.argv[2];
  const archivePath = archiveArgument
    ? path.resolve(archiveArgument)
    : await latestArchive();
  if (!archivePath.toLowerCase().endsWith(".zip.enc")) {
    throw new Error("The restore source must be an ASOL .zip.enc archive.");
  }

  const sevenZip = findSevenZip();
  const restoreDirectory = await createRestoreDirectory();
  const decryptedZipPath = path.join(restoreDirectory, "secrets.zip");

  try {
    console.log(`Restoring from: ${archivePath}`);
    const password = await promptHidden("Private-key password: ");
    await decryptArchiveToZip(archivePath, decryptedZipPath, password);
    assertSafeArchiveEntries(listArchivePaths(sevenZip, decryptedZipPath));
    runSevenZip(sevenZip, ["x", decryptedZipPath, `-o${restoreDirectory}`, "-y"]);
    const manifestPath = path.join(restoreDirectory, MANIFEST_FILE_NAME);
    const manifest = JSON.parse(
      await readFile(manifestPath, "utf8"),
    ) as SecretArchiveManifest;
    const restored = await restoreManifestFiles(manifest, restoreDirectory);
    await writeLastBackupState(manifest, archivePath);
    console.log(`Restored and replaced ${restored} secret file(s).`);
  } finally {
    await removeTemporaryPath(restoreDirectory);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
