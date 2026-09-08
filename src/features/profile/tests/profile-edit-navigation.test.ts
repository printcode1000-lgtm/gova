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
// Absolute programmatic selection lives in one shared helper, used by every
// snapping tab strip.
const snapStripScroll = source('src/shared/ui/snap-strip-scroll.ts');
assert.match(snapStripScroll, /parent\.style\.scrollSnapType = "none"/);
assert.match(snapStripScroll, /parent\.style\.scrollBehavior = "auto"/);
assert.match(navigation, /centerElementInScrollParent/);
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
assert.match(registrationCard, /profile\.registration\.aliasLabel/);
assert.match(registrationCard, /updateField\("storeName"/);

const providerAccountUiStart = registrationCard.indexOf(
  "features-profile-presentation-profileregistrationinfocard-div-35-uv2m4q",
);
assert.notEqual(providerAccountUiStart, -1, "provider-account UI container must exist");
const passwordUiStart = registrationCard.indexOf(
  "features-profile-presentation-profileregistrationinfocard-div-50-v6n4qt",
);
assert.notEqual(passwordUiStart, -1, "password UI container must exist");
assert.ok(
  providerAccountUiStart > passwordUiStart,
  "activity/provider activation must appear after the change-password disclosure",
);
const providerAccountUi = registrationCard.slice(providerAccountUiStart);
assert.match(
  registrationCard,
  /const \[isProviderAccountOpen, setIsProviderAccountOpen\] = React\.useState\(false\)/,
);
assert.doesNotMatch(
  registrationCard,
  /const \[isProviderAccountEnabled, setIsProviderAccountEnabled\]/,
  "provider-account mode must come from the current-user registration draft, not component-local state",
);
assert.match(providerAccountUi, /profile\.providerAccount\.title/);
assert.match(providerAccountUi, /<BriefcaseBusiness/);
assert.match(providerAccountUi, /<Switch/);
assert.match(providerAccountUi, /checked=\{providerAccountEnabled\}/);
assert.match(
  providerAccountUi,
  /updateRegistrationField\("providerAccountEnabled", enabled\)/,
);
assert.match(providerAccountUi, /onProviderAccountEnabledChange\(enabled\)/);
assert.doesNotMatch(providerAccountUi, /asolApi|fetch\(/);

const providerWorkspaceView = source(
  'src/features/profile/presentation/profile-page/ProfileEditWorkspaceView.tsx',
);
const providerWorkspaceChrome = source(
  'src/features/profile/presentation/profile-page/ProfileEditWorkspaceChrome.tsx',
);
assert.match(providerWorkspaceView, /profile\.storeIdentity\.activityTitle/);
assert.match(providerWorkspaceChrome, /profile\.storeIdentity\.activityTitle/);
assert.match(
  providerWorkspaceView,
  /providerAccountEnabled \? \(\s*<ProfileEditTabsBar id='profile-presentation-profile-page-profileeditworkspaceview-profileedittabsbar-2-1zx3up'/,
);
assert.match(
  providerWorkspaceView,
  /className=\{providerAccountEnabled \? [^}]+ : "hidden"\}/,
  "provider-only edit panels must be hidden while the current user is a personal account",
);
assert.match(
  providerWorkspaceView,
  /aria-hidden=\{providerAccountEnabled && activeTab !== "registration"\}/,
);
assert.match(
  providerWorkspaceView,
  /onProviderAccountEnabledChange=\{setProviderAccountEnabled\}/,
);
assert.match(model, /session\?\.providerAccountEnabled === true/);
assert.match(model, /selectSection\("registration"\)/);

const storeDetailsHook = source('src/features/profile/presentation/hooks/use-store-details.ts');
assert.match(storeDetailsHook, /store-name-draft/);

console.log('Profile edit navigation and snapshot lifecycle tests passed.');
