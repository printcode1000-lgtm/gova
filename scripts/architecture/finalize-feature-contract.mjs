import { readFileSync, writeFileSync } from 'node:fs';

const file = 'packages/architecture-core/src/contracts/contract.ts';
let content = readFileSync(file, 'utf8');

const legacyServiceBlock = `  if (p.startsWith('src/features/release-commands/tests/')) return 'dev-tools';\n  if (p.startsWith('src/features/release-commands/services/') && p.endsWith('-api-service.ts')) return 'client-services';\n  if (p.startsWith('src/features/release-commands/services/')) return 'server-services';\n  if (p.startsWith('src/features/data-health/services/')) return 'server-services';\n  if (p.startsWith('src/features/dev-cloud-backup/services/')) return 'server-services';\n  if (p.startsWith('src/features/google-play-console/services/')) return 'server-services';\n  if (p.startsWith('src/features/data-health/tests/')) return 'dev-tools';\n  if (p.startsWith('src/features/dev-cloud-backup/tests/')) return 'dev-tools';\n`;
const canonicalServiceBlock = `  if (p.startsWith('src/features/release-commands/tests/')) return 'dev-tools';\n  if (p.startsWith('src/features/data-health/tests/')) return 'dev-tools';\n  if (p.startsWith('src/features/dev-cloud-backup/tests/')) return 'dev-tools';\n`;

if (!content.includes(legacyServiceBlock) && !content.includes(canonicalServiceBlock)) {
  throw new Error('Layer classifier service block no longer matches the expected contract. Review manually.');
}
content = content.replace(legacyServiceBlock, canonicalServiceBlock);
content = content.replace(
  `  if (p.includes('/application/') && p.includes('/features/storage/')) return 'server-services';\n`,
  '',
);

writeFileSync(file, content);
console.log('Removed obsolete pre-canonical feature service paths from the layer classifier.');
