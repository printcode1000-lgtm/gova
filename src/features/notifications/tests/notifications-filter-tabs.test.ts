import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

function source(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

const hook = source(
  'src/features/notifications/presentation/hooks/use-notifications-filter.ts',
);
const storage = source(
  'src/features/notifications/application/notifications-filter-storage.ts',
);
const page = source(
  'src/features/notifications/presentation/NotificationsPageContent.tsx',
);

// The selected filter must survive leaving and re-entering the page without a
// `?filter=` query. The notifications feature may not depend on the
// page-snapshot feature, so this record carries restoration on its own.
assert.doesNotMatch(hook, /from "@\/features\/page-snapshot"/);
assert.match(hook, /readStoredNotificationsFilter/);
assert.match(hook, /writeStoredNotificationsFilter/);
assert.match(storage, /ASOL_DB_STORES\.APP_SETTINGS/);
assert.match(storage, /asolDbGet/);
assert.match(storage, /asolDbSet/);

// Restoration precedence: `?filter=` wins, then the stored per-user tab.
assert.match(hook, /requestedFilterRef/);
assert.match(hook, /restoredRef/);

// The notifications filter strip uses the shared 3D spatial carousel.
assert.doesNotMatch(hook, /centerElementInScrollParent/);
assert.match(page, /useSpatialCarousel/);
assert.match(page, /SPATIAL_CAROUSEL_VIEWPORT_CLASSNAME/);
assert.match(page, /getSpatialCarouselItemPresentation/);
assert.match(page, /onSettledIndex/);

// The strip position is derived from the selected tab, so it must not be
// captured for generic element-scroll restoration.
assert.doesNotMatch(page, /data-snapshot-scroll/);

// Filter state is owned by the hook, not duplicated in the page component.
assert.match(hook, /React\.useState<NotificationFilter>/);
assert.doesNotMatch(page, /useState<NotificationFilter>/);

console.log('Notifications filter tab restoration tests passed.');
