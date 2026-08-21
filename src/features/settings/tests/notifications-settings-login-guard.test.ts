import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

function source(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

const page = source(
  'src/features/settings/presentation/NotificationsSettingsPageContent.tsx',
);
const dialog = source('src/features/auth/components/LoginRequiredDialog.tsx');

assert.match(page, /LoginRequiredDialog/);
assert.match(page, /!isLoggedIn/);
assert.match(page, /settings\.notifications\.loginRequired\.title/);
assert.match(page, /leavePage/);
assert.match(dialog, /signInHref = "\/login"/);

console.log('Notifications settings login guard tests passed.');
