/**
 * CLI: regenerate architecture reference docs from canonical registries.
 */
import { writeArchitectureDocs, GENERATED_ARCHITECTURE_DOCS } from '@asol/architecture-core';

writeArchitectureDocs();
console.log(`Regenerated ${GENERATED_ARCHITECTURE_DOCS.length} architecture reference docs.`);
for (const id of GENERATED_ARCHITECTURE_DOCS) console.log(`  ${id}`);
