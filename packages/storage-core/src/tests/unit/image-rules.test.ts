import assert from 'node:assert/strict';
import {
  validateImageMimeType,
  validateImageSizeBytes,
  validateImageForProfile,
} from '../../domain/images/image-rules';
import { StorageProfileClientView } from '../../domain/profiles/storage-profile.types';

export function runImageRulesTest() {
  const profile: StorageProfileClientView = {
    id: 'test-profile',
    outputFormat: 'webp',
    maxImageSizeKB: 2048,
  };

  // 1. Mime type validation
  assert.doesNotThrow(() => validateImageMimeType('image/png'));
  assert.doesNotThrow(() => validateImageMimeType('image/jpeg'));
  assert.throws(
    () => validateImageMimeType('application/pdf'),
    (err: any) => err instanceof Error && err.message.includes('Only image files'),
  );

  // 2. Profile size validation
  assert.doesNotThrow(() => validateImageForProfile(1024, profile));
  assert.doesNotThrow(() => validateImageSizeBytes(1024, 2048));

  assert.throws(
    () => validateImageForProfile(5 * 1024 * 1024, profile),
    (err: any) => err instanceof Error && err.message.includes('exceeds maximum size'),
  );

  console.log('✅ Unit test: image rules passed');
}
