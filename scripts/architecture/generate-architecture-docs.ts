/**
 * CLI: regenerate architecture and repository-wide agent knowledge from canonical repository state.
 */
import {
  writeArchitectureDocs,
  GENERATED_ARCHITECTURE_DOCS,
  writeFeatureSeamsDoc,
  GENERATED_FEATURE_SEAMS_DOC,
} from '@asol/architecture-core';

import {
  GENERATED_KNOWLEDGE_FILES,
  writeGeneratedKnowledge,
} from '../docs/generate';

writeArchitectureDocs();
writeFeatureSeamsDoc();
writeGeneratedKnowledge();

console.log(
  `Regenerated ${GENERATED_ARCHITECTURE_DOCS.length + 1} architecture reference docs.`,
);
for (const id of GENERATED_ARCHITECTURE_DOCS) console.log(`  ${id}`);
console.log(`  ${GENERATED_FEATURE_SEAMS_DOC}`);
console.log(`Regenerated ${GENERATED_KNOWLEDGE_FILES.length} repository agent-knowledge files.`);
for (const id of GENERATED_KNOWLEDGE_FILES) console.log(`  ${id}`);
