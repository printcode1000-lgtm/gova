import {
  collectMutabilityChangeErrors,
  listChangedPathsAgainst,
  loadDocumentMutabilityRegistry,
  validateDocumentMutabilityRegistry,
} from './document-mutability';

export function runMutabilityCheck(options?: { baseRef?: string; requireChangedAuthorization?: boolean }): string[] {
  const errors = validateDocumentMutabilityRegistry();
  if (options?.requireChangedAuthorization !== false) {
    const changed = listChangedPathsAgainst(options?.baseRef);
    errors.push(...collectMutabilityChangeErrors(changed));
  }
  // Ensure registry loads and classifies without throwing.
  loadDocumentMutabilityRegistry();
  return [...new Set(errors)].sort();
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/scripts/docs/mutability-check.ts')) {
  const baseRef = process.argv.includes('--base')
    ? process.argv[process.argv.indexOf('--base') + 1]
    : process.env.DOCS_CI_BASE_REF;
  const errors = runMutabilityCheck({ baseRef });
  if (errors.length) {
    console.error('Document mutability check failed:');
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log('Document mutability check passed.');
  }
}
