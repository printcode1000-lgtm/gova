import assert from 'node:assert/strict';
import { shouldUseUnoptimizedImage } from '../../domain/images/external-image';

export function runExternalImageTest() {
  assert.equal(shouldUseUnoptimizedImage(''), false);
  assert.equal(shouldUseUnoptimizedImage('/images/catalog/item.webp'), false);
  assert.equal(shouldUseUnoptimizedImage('blob:https://localhost/preview'), true);
  assert.equal(shouldUseUnoptimizedImage('data:image/webp;base64,abc'), true);
  assert.equal(
    shouldUseUnoptimizedImage(
      '/sync_data/sync_file/images/advertisements/home-hero-slider/a.webp',
    ),
    true,
  );
  assert.equal(
    shouldUseUnoptimizedImage('https://pub-example.r2.dev/images/a.webp'),
    true,
  );
  assert.equal(
    shouldUseUnoptimizedImage('https://cdn.example.com/images/a.webp'),
    false,
  );
  console.log('✅ Unit test: external image unoptimized policy passed');
}
