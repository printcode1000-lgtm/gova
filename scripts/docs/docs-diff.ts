import { execFileSync } from 'node:child_process';

import { diffGeneratedKnowledge, GENERATED_KNOWLEDGE_FILES } from './generate';

function workingTreeGeneratedDiffErrors(): string[] {
  const errors: string[] = [];
  try {
    const status = execFileSync(
      'git',
      ['status', '--porcelain', '--', ...GENERATED_KNOWLEDGE_FILES],
      { encoding: 'utf8' },
    ).trim();
    if (!status) return errors;
    errors.push('generated documentation differs from committed HEAD after regeneration');
    console.error('Generated documentation changed after regeneration:');
    console.error(status);
    try {
      execFileSync('git', ['diff', '--', ...GENERATED_KNOWLEDGE_FILES], { stdio: 'inherit' });
    } catch {
      // The porcelain status above is the authoritative failure; diff output is diagnostic only.
    }
  } catch (error) {
    errors.push(
      `cannot compare generated documentation against HEAD: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  return errors;
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/scripts/docs/docs-diff.ts')) {
  const errors = diffGeneratedKnowledge();
  if (process.argv.includes('--against-head')) errors.push(...workingTreeGeneratedDiffErrors());
  const uniqueErrors = [...new Set(errors)].sort();
  if (uniqueErrors.length) {
    console.error('Generated documentation diff failed:');
    for (const error of uniqueErrors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log(
      process.argv.includes('--against-head')
        ? 'Generated documentation matches live regeneration and committed HEAD.'
        : 'Generated documentation matches live regeneration.',
    );
  }
}
