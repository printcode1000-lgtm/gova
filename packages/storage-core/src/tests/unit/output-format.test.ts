import assert from 'node:assert/strict';
import {
  ALLOWED_OUTPUT_FORMATS,
  getMimeTypeForOutputFormat,
  buildUploadFilename,
  isAllowedOutputFormat,
} from '../../domain/images/output-format.registry';

export function runOutputFormatTest() {
  assert.equal(getMimeTypeForOutputFormat('webp'), 'image/webp');
  assert.ok(isAllowedOutputFormat('webp'));
  assert.ok(!isAllowedOutputFormat('invalid-format'));

  const filename = buildUploadFilename('webp');
  assert.equal(filename, 'image.webp');

  assert.ok(ALLOWED_OUTPUT_FORMATS.includes('webp'));

  console.log('✅ Unit test: output format passed');
}
