import { diffGeneratedKnowledge } from './generate';

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/scripts/docs/docs-diff.ts')) {
  const errors = diffGeneratedKnowledge();
  if (errors.length) {
    console.error('Generated documentation diff failed:');
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log('Generated documentation matches live regeneration.');
  }
}
