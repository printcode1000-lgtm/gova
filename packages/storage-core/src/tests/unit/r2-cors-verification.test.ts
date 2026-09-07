import assert from 'node:assert/strict';
import { buildDefaultR2CorsRules } from '../../server/transport/r2-cors-policy';
import { r2CorsRulesMatch } from '../../server/transport/r2-cors-verification';

export function runR2CorsVerificationTest(): void {
  const expected = buildDefaultR2CorsRules();
  const reordered = structuredClone(expected);
  reordered[0]!.allowed.methods.reverse();
  reordered[0]!.exposeHeaders?.reverse();
  assert.equal(r2CorsRulesMatch(expected, reordered), true);

  const missingOrigin = structuredClone(expected);
  missingOrigin[0]!.allowed.origins = ['https://wrong.example'];
  assert.equal(r2CorsRulesMatch(expected, missingOrigin), false);


  console.log('R2 CORS verification contract passed.');
}
