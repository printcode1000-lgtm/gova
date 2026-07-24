import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const manifestPath = path.resolve(
  "android",
  "app",
  "src",
  "main",
  "AndroidManifest.xml",
);
const backupRulesPath = path.resolve(
  "android",
  "app",
  "src",
  "main",
  "res",
  "xml",
  "backup_rules.xml",
);
const extractionRulesPath = path.resolve(
  "android",
  "app",
  "src",
  "main",
  "res",
  "xml",
  "data_extraction_rules.xml",
);

function readRequired(filePath: string): string {
  if (!existsSync(filePath)) {
    throw new Error(
      `Required Android backup policy file is missing: ${filePath}`,
    );
  }
  return readFileSync(filePath, "utf8");
}

function requireMatch(source: string, pattern: RegExp, message: string): void {
  if (!pattern.test(source)) throw new Error(message);
}

const manifest = readRequired(manifestPath);
const backupRules = readRequired(backupRulesPath);
const extractionRules = readRequired(extractionRulesPath);

requireMatch(
  manifest,
  /android:allowBackup\s*=\s*"false"/,
  'AndroidManifest.xml must set android:allowBackup="false".',
);
requireMatch(
  manifest,
  /android:fullBackupContent\s*=\s*"@xml\/backup_rules"/,
  "AndroidManifest.xml must reference @xml/backup_rules.",
);
requireMatch(
  manifest,
  /android:dataExtractionRules\s*=\s*"@xml\/data_extraction_rules"/,
  "AndroidManifest.xml must reference @xml/data_extraction_rules.",
);

for (const domain of ["root", "file", "database", "sharedpref", "external"]) {
  requireMatch(
    backupRules,
    new RegExp(`<exclude\\s+domain="${domain}"\\s+path="\\."\\s*/>`),
    `backup_rules.xml must exclude the complete ${domain} domain.`,
  );
}

for (const section of ["cloud-backup", "device-transfer"]) {
  requireMatch(
    extractionRules,
    new RegExp(`<${section}>[\\s\\S]*?<\\/${section}>`),
    `data_extraction_rules.xml must define ${section}.`,
  );
}

for (const domain of [
  "root",
  "file",
  "database",
  "sharedpref",
  "external",
  "device_root",
  "device_file",
  "device_database",
  "device_sharedpref",
]) {
  const matches = extractionRules.match(
    new RegExp(`<exclude\\s+domain="${domain}"\\s+path="\\."\\s*/>`, "g"),
  );
  if (matches?.length !== 2) {
    throw new Error(
      `data_extraction_rules.xml must exclude ${domain} from cloud backup and device transfer.`,
    );
  }
}

console.log(
  "Android backup policy verified: cloud backup, auto-restore, and device transfer are disabled for all ASOL client data.",
);
