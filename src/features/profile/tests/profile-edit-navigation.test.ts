import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

function source(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

const types = source('src/features/profile/presentation/profile-page.types.ts');
const navigation = source('src/features/profile/presentation/use-profile-navigation.ts');
const model = source('src/features/profile/presentation/profile-page/ProfilePageContent.model.tsx');
const runtime = source('packages/page-snapshot-core/src/runtime/page-snapshot-runtime.ts');

assert.match(types, /"registration",\s*\n\s*"specialties",\s*\n\s*"store",/);
assert.match(types, /PROFILE_EDIT_SNAPSHOT_SCROLL_IDS/);
assert.match(navigation, /resyncScrollToActiveTab/);
assert.match(navigation, /tabsScrollRef/);
assert.match(model, /PROFILE_EDIT_SNAPSHOT_SCROLL_IDS/);
assert.match(model, /resyncScrollToActiveTab\(\)/);
assert.match(runtime, /profile-edit-/);

console.log('Profile edit navigation tests passed.');
