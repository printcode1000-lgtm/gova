/**
 * CLI: regenerate architecture reference docs from canonical registries.
 */
import {
  writeArchitectureDocs,
  GENERATED_ARCHITECTURE_DOCS,
  writeFeatureSeamsDoc,
  GENERATED_FEATURE_SEAMS_DOC,
} from '@asol/architecture-core';

writeArchitectureDocs();
writeFeatureSeamsDoc();
console.log(
  `Regenerated ${GENERATED_ARCHITECTURE_DOCS.length + 1} architecture reference docs.`,
);
for (const id of GENERATED_ARCHITECTURE_DOCS) console.log(`  ${id}`);
console.log(`  ${GENERATED_FEATURE_SEAMS_DOC}`);
