import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { unzipSync } from "fflate";

import {
  MANIFEST_FILE_NAME,
  type SecretArchiveManifest,
  createRestoreDirectory,
  removeTemporaryPath,
  resolveRestoreArchivePath,
  restoreManifestFiles,
  writeLastBackupState,
} from "@asol/secrets-core";
import {
  decryptArchiveToZip,
  resolveArchivePassword,
} from "@asol/secrets-core";

async function extractZipSafely(zipPath: string, destinationRoot: string): Promise<void> {
  const entries = unzipSync(await readFile(zipPath));
  const root = path.resolve(destinationRoot);
  const rootPrefix = `${root}${path.sep}`;
  for (const [entry, contents] of Object.entries(entries)) {
    const normalized = entry.replace(/\\/g, "/");
    if (
      normalized.startsWith("/") ||
      /^[A-Za-z]:\//.test(normalized) ||
      normalized.split("/").includes("..")
    ) {
      throw new Error(`Unsafe path found in archive: ${entry}`);
    }
    if (!normalized || normalized.endsWith("/")) continue;
    const destination = path.resolve(root, ...normalized.split("/"));
    if (!destination.startsWith(rootPrefix)) {
      throw new Error(`Archive path escapes the restore directory: ${entry}`);
    }
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, contents);
  }
}

async function main(): Promise<void> {
  const archiveArgument = process.argv[2];
  const archivePath = archiveArgument
    ? path.resolve(archiveArgument)
    : await resolveRestoreArchivePath();
  if (!archivePath.toLowerCase().endsWith(".zip.enc")) {
    throw new Error("The restore source must be an ASOL .zip.enc archive.");
  }

  const restoreDirectory = await createRestoreDirectory();
  const decryptedZipPath = path.join(restoreDirectory, "secrets.zip");

  try {
    console.log(`Restoring from: ${archivePath}`);
    const password = await resolveArchivePassword("Private-key password: ");
    await decryptArchiveToZip(archivePath, decryptedZipPath, password);
    await extractZipSafely(decryptedZipPath, restoreDirectory);
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
