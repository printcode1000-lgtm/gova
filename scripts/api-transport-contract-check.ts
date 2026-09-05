#!/usr/bin/env tsx
import { scanApiTransportContract } from '@asol/architecture-core';

const violations = scanApiTransportContract();
if (violations.length > 0) {
  console.error(`API transport contract: ${violations.length} violation(s).`);
  for (const item of violations) {
    console.error(`${item.file}:${item.line}\t${item.type}\t${item.detail}`);
  }
  process.exitCode = 1;
} else {
  console.log('API transport contract passed: zero owned snake_case/direct JSON boundary violations.');
}
