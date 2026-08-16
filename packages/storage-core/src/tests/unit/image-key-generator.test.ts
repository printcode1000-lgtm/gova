import assert from 'node:assert/strict';
import { ImageKeyGenerator, imageKeyGenerator } from '../../domain/images/image-key-generator';

export function runImageKeyGeneratorTest() {
  // 1. Basic key generation
  const key1 = imageKeyGenerator.generate('webp');
  assert.ok(key1.endsWith('.webp'));
  assert.ok(key1.length > 10);

  // 2. Uniqueness
  const key2 = imageKeyGenerator.generate('webp');
  assert.notEqual(key1, key2, 'Generated keys must be unique');

  // 3. Error on missing format
  assert.throws(
    () => (imageKeyGenerator as any).generate(),
    (err: any) => err instanceof Error && err.message.includes('outputFormat'),
    'Must throw if outputFormat is missing',
  );

  console.log('✅ Unit test: image key generator passed');
}
