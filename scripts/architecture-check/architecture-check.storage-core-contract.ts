import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { violations } from './architecture-check.architecture-types';
import {
  R2_S3_CLIENT_ALLOWED_IMPORTERS,
  IMAGE_STORAGE_CLIENT_ENTRY,
  IMAGE_STORAGE_SERVER_UPLOAD_ROUTE,
  IMAGE_STORAGE_APPLICATION_LAYER,
  IMAGE_STORAGE_API_ADAPTER,
  IMAGE_STORAGE_API_ADAPTER_ALLOWED_IMPORTERS,
  IMAGE_STORAGE_FORBIDDEN_PATTERNS,
  IMAGE_STORAGE_FORBIDDEN_PATTERN_EXEMPT,
} from '../../src/core/architecture/image-storage-contract';

export function checkStorageCoreContract(file: string, content: string): void {
  // 1. Storage API adapter import restrictions
  if (
    content.includes(IMAGE_STORAGE_API_ADAPTER) &&
    !IMAGE_STORAGE_API_ADAPTER_ALLOWED_IMPORTERS.has(file)
  ) {
    violations.push(
      `${file}: Direct import of ${IMAGE_STORAGE_API_ADAPTER} is forbidden outside feature storage service`,
    );
  }

  // 2. Forbidden pattern checks
  if (!IMAGE_STORAGE_FORBIDDEN_PATTERN_EXEMPT.has(file) && !file.startsWith('packages/storage-core/')) {
    for (const rule of IMAGE_STORAGE_FORBIDDEN_PATTERNS) {
      if (rule.pattern.test(content)) {
        violations.push(`${file}: ${rule.message}`);
      }
    }
  }
}

/**
 * Self-check: ensures no path-based contract rules in contract.ts match 0 files repo-wide.
 */
export function checkDeadContractRules(allFileContents: Map<string, string>): void {
  const contractPath = path.join(process.cwd(), 'src', 'core', 'architecture', 'contract.ts');
  if (!existsSync(contractPath)) return;

  const content = readFileSync(contractPath, 'utf8');
  const patternRegex = /importPath\.includes\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  let match: RegExpExecArray | null;

  while ((match = patternRegex.exec(content)) !== null) {
    const pattern = match[1];
    let matchCount = 0;
    for (const fileContent of allFileContents.values()) {
      if (fileContent.includes(pattern)) {
        matchCount++;
        break;
      }
    }
    if (matchCount === 0) {
      violations.push(
        `Dead contract rule detected in contract.ts: importPath.includes('${pattern}') matches 0 files in repo`,
      );
    }
  }
}
