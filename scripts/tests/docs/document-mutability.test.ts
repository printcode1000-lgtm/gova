import assert from 'node:assert/strict';

import {
  classifyDocumentationPath,
  collectMutabilityChangeErrors,
  DOCS_CONTRACT_CHANGE_MARKER,
  formatMutabilityViolation,
  loadDocumentMutabilityRegistry,
  validateDocumentMutabilityRegistry,
} from '../../docs/document-mutability';

const registryErrors = validateDocumentMutabilityRegistry();
assert.deepEqual(registryErrors, [], registryErrors.join('\n'));

const registry = loadDocumentMutabilityRegistry();
assert.equal(classifyDocumentationPath('docs/09-agent-knowledge/runtime-contract.md', registry)?.classification, 'protected');
assert.equal(classifyDocumentationPath('docs/08-troubleshooting/README.md', registry)?.classification, 'editable');
assert.equal(classifyDocumentationPath('docs/09-agent-knowledge/generated/catalogs/route-catalog.md', registry)?.classification, 'generated');
assert.equal(classifyDocumentationPath('docs/04-ui-components/touch-interaction-policy.md', registry)?.classification, 'protected');
assert.equal(classifyDocumentationPath('docs/04-ui-components/README.md', registry)?.classification, 'editable');

const unauthorized = collectMutabilityChangeErrors(
  ['docs/09-agent-knowledge/runtime-contract.md'],
  { commitMessage: 'feat: tweak docs', env: {} },
);
assert.ok(unauthorized.some((error) => error.includes('PROTECTED DOCUMENTATION')));
assert.ok(unauthorized.some((error) => error.includes(DOCS_CONTRACT_CHANGE_MARKER)));

const authorized = collectMutabilityChangeErrors(
  ['docs/09-agent-knowledge/runtime-contract.md'],
  { commitMessage: `chore: ${DOCS_CONTRACT_CHANGE_MARKER} update runtime contract`, env: {} },
);
assert.deepEqual(authorized, []);

const envAuthorized = collectMutabilityChangeErrors(
  ['AGENTS.md'],
  { commitMessage: 'no marker', env: { DOCS_CONTRACT_CHANGE: '1' } },
);
assert.deepEqual(envAuthorized, []);

const message = formatMutabilityViolation(
  {
    path: 'docs/01-architecture/README.md',
    classification: 'protected',
    reason: 'Architecture contracts and enforcement docs',
    matchedEntryPath: 'docs/01-architecture/',
  },
  'protected',
);
assert.ok(message.includes('PROTECTED DOCUMENTATION'));
assert.ok(message.includes('safer alternative'));

console.log('Document mutability tests passed.');
