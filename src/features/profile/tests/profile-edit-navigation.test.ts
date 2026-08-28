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
const snapshotHooks = source('src/features/page-snapshot/presentation/hooks/use-page-snapshot.tsx');

assert.match(types, /"registration",\s*\n\s*"specialties",\s*\n\s*"store",/);
assert.match(types, /PROFILE_EDIT_SNAPSHOT_SCROLL_IDS/);
assert.match(navigation, /resyncScrollToActiveTab/);
assert.match(navigation, /tabsScrollRef/);
assert.match(navigation, /activeTabRef/);
assert.match(navigation, /parent\.style\.scrollSnapType = "none"/);
assert.match(navigation, /parent\.style\.scrollBehavior = "auto"/);
assert.match(
  navigation,
  /activeTabRef\.current = section;\s*setActiveTab\(section\);\s*scrollToSection\(section\)/,
);
assert.match(
  navigation,
  /scrollToSection\(activeTabRef\.current\)/,
);
assert.doesNotMatch(navigation, /suppressScrollSyncUntilRef/);

// Carousel height must track the active panel exactly (no dead space, no
// cropping) and must never grow monotonically.
const tabStorage = source(
  'src/features/profile/application/services/profile-edit-tab-storage.ts',
);
assert.match(navigation, /syncCarouselHeight/);
assert.match(navigation, /new ResizeObserver\(scheduleSync\)/);
assert.match(navigation, /animateCarouselHeight/);
assert.doesNotMatch(navigation, /Math\.max\(currentHeight \?\? 0/);
assert.match(navigation, /isSwipingRef/);

// The active tab must survive leaving and re-entering the editor through a
// different query string, which changes the page-snapshot key.
assert.match(navigation, /readStoredProfileEditTab/);
assert.match(navigation, /writeStoredProfileEditTab/);
assert.match(tabStorage, /ASOL_DB_STORES\.APP_SETTINGS/);
assert.doesNotMatch(tabStorage, /localStorage|sessionStorage/);

const workspaceView = source(
  'src/features/profile/presentation/profile-page/ProfileEditWorkspaceView.tsx',
);
assert.match(workspaceView, /animateCarouselHeight \? "300ms" : "0ms"/);
assert.match(model, /PROFILE_EDIT_SNAPSHOT_SCROLL_IDS/);
assert.match(model, /resyncScrollToActiveTab\(\)/);
assert.match(runtime, /profile-edit-/);

// Generic snapshot-state lifecycle contract: every component using
// useSnapshotState must expose its latest value synchronously to navigation
// flushes, restoration must not schedule a save of the restored value, and a
// stale unmount must never delete a newer registration for the same state key.
assert.match(snapshotHooks, /const registeredEntry = entry as SnapshotRegistryEntry/);
assert.match(snapshotHooks, /registryRef\.current\.get\(key\) === registeredEntry/);
assert.match(snapshotHooks, /const registerState = context\?\.registerState/);
assert.match(
  snapshotHooks,
  /valueRef\.current = next;\s*setValue\(next\);\s*if \(!Object\.is\(previous, next\)\)/,
);
assert.match(
  snapshotHooks,
  /set: \(next\) => \{\s*valueRef\.current = next;\s*setValue\(next\);\s*\}/,
);
assert.doesNotMatch(snapshotHooks, /context\?\.requestSave\(\)/);
assert.doesNotMatch(snapshotHooks, /\[context, value\]/);

const registrationCard = source('src/features/profile/presentation/ProfileRegistrationInfoCard.tsx');
assert.match(registrationCard, /useStoreDetails/);
assert.match(registrationCard, /auth\.storeName\.label/);
assert.match(registrationCard, /updateField\("storeName"/);

const storeDetailsHook = source('src/features/profile/presentation/hooks/use-store-details.ts');
assert.match(storeDetailsHook, /store-name-draft/);

console.log('Profile edit navigation and snapshot lifecycle tests passed.');
