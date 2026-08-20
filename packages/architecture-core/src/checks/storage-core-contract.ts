import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { addViolation } from './architecture-types';
import {
  R2_S3_CLIENT_ALLOWED_IMPORTERS,
  IMAGE_STORAGE_CLIENT_ENTRY,
  IMAGE_STORAGE_SERVER_UPLOAD_ROUTE,
  IMAGE_STORAGE_APPLICATION_LAYER,
  IMAGE_STORAGE_API_ADAPTER,
  IMAGE_STORAGE_API_ADAPTER_ALLOWED_IMPORTERS,
  IMAGE_STORAGE_FORBIDDEN_PATTERNS,
  IMAGE_STORAGE_FORBIDDEN_PATTERN_EXEMPT,
} from '../contracts/image-storage-contract';

export function checkStorageCoreContract(file: string, content: string): void {
  // 1. Storage API adapter import restrictions
  if (
    content.includes(IMAGE_STORAGE_API_ADAPTER) &&
    !IMAGE_STORAGE_API_ADAPTER_ALLOWED_IMPORTERS.has(file)
  ) {
    addViolation(
      'Storage Core Contract',
      file,
      `Direct import of ${IMAGE_STORAGE_API_ADAPTER} is forbidden outside the feature storage service.`,
      `Allowed importers: ${[...IMAGE_STORAGE_API_ADAPTER_ALLOWED_IMPORTERS].join(', ')}`,
    );
  }

  // 2. Forbidden pattern checks
  if (!IMAGE_STORAGE_FORBIDDEN_PATTERN_EXEMPT.has(file) && !file.startsWith('packages/storage-core/')) {
    for (const rule of IMAGE_STORAGE_FORBIDDEN_PATTERNS) {
      if (rule.pattern.test(content)) {
        addViolation('Storage Core Contract', file, rule.message);
      }
    }
  }
}

/**
 * Self-check: ensures no path-based contract rules in contract.ts match 0 files repo-wide.
 */
export function checkDeadContractRules(allFileContents: Map<string, string>): void {
  const contractPath = path.join(
    process.cwd(),
    'packages/architecture-core/src/contracts/contract.ts',
  );
  // Not `if (!existsSync) return`: that guard is how a self-check quietly stops checking after a
  // file moves. If the contract is not where this expects it, the run must fail loudly.
  if (!existsSync(contractPath)) {
    throw new Error(
      `Architecture contract not found at ${contractPath}. A self-check that cannot find what it ` +
        'checks reports green while asserting nothing.',
    );
  }

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
      addViolation(
        'Storage Core Contract',
        'packages/architecture-core/src/contracts/contract.ts',
        `Dead contract rule: importPath.includes('${pattern}') matches no file in the repository.`,
        'Remove the rule or fix the pattern — a rule that matches nothing protects nothing.',
      );
    }
  }
}
