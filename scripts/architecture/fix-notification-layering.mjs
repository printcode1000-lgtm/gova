import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const ROOT = process.cwd();

const moves = [
  [
    'src/features/notifications/application/shared/keyed-mutex.ts',
    'src/features/notifications/infrastructure/concurrency/keyed-mutex.ts',
  ],
  [
    'src/features/notifications/application/shared/read-notification-locale.ts',
    'src/features/notifications/infrastructure/preferences/read-notification-locale.ts',
  ],
  [
    'src/features/notifications/application/services/notification-api-service.ts',
    'src/features/notifications/infrastructure/http/notification-api-service.ts',
  ],
];

for (const [fromRel, toRel] of moves) {
  const from = join(ROOT, fromRel);
  const to = join(ROOT, toRel);
  if (existsSync(from)) {
    if (existsSync(to)) {
      throw new Error(`Notification layering move is ambiguous: both ${fromRel} and ${toRel} exist.`);
    }
    mkdirSync(dirname(to), { recursive: true });
    renameSync(from, to);
  } else if (!existsSync(to)) {
    throw new Error(`Notification layering source and target are both missing: ${fromRel} -> ${toRel}`);
  }
}

const replacements = new Map([
  [
    'src/features/notifications/infrastructure/asol-notification-repository.ts',
    [['../application/shared/keyed-mutex', './concurrency/keyed-mutex']],
  ],
  [
    'src/features/notifications/infrastructure/native/native-push.service.ts',
    [
      ['../../application/shared/read-notification-locale', '../preferences/read-notification-locale'],
      ['../../application/shared/keyed-mutex', '../concurrency/keyed-mutex'],
    ],
  ],
  [
    'src/features/notifications/infrastructure/web-push/web-push-browser.service.ts',
    [
      ['../../application/services/notification-api-service', '../http/notification-api-service'],
      ['../../application/shared/read-notification-locale', '../preferences/read-notification-locale'],
    ],
  ],
  [
    'src/features/notifications/application/notification-sync-service.ts',
    [['./shared/keyed-mutex', '../infrastructure/concurrency/keyed-mutex']],
  ],
  [
    'src/features/notifications/application/native-inbox-service.ts',
    [['./shared/keyed-mutex', '../infrastructure/concurrency/keyed-mutex']],
  ],
  [
    'src/features/notifications/application/public/notification-facade.ts',
    [
      ['../services/notification-api-service', '../../infrastructure/http/notification-api-service'],
      ['../shared/keyed-mutex', '../../infrastructure/concurrency/keyed-mutex'],
    ],
  ],
  [
    'src/features/notifications/application/device-token-service.ts',
    [
      ['./services/notification-api-service', '../infrastructure/http/notification-api-service'],
      ['./shared/keyed-mutex', '../infrastructure/concurrency/keyed-mutex'],
    ],
  ],
  [
    'src/features/notifications/tests/notification-broadcast-delivery.test.ts',
    [['../application/services/notification-api-service', '../infrastructure/http/notification-api-service']],
  ],
  [
    'src/features/notifications/tests/notification-account-surface.test.ts',
    [[
      'src/features/notifications/application/services/notification-api-service.ts',
      'src/features/notifications/infrastructure/http/notification-api-service.ts',
    ]],
  ],
]);

for (const [fileRel, pairs] of replacements) {
  const file = join(ROOT, fileRel);
  let text = readFileSync(file, 'utf8');
  for (const [before, after] of pairs) {
    if (text.includes(before)) {
      text = text.replaceAll(before, after);
    } else if (!text.includes(after)) {
      throw new Error(`${fileRel} contains neither expected old reference ${before} nor canonical reference ${after}.`);
    }
  }
  writeFileSync(file, text);
}

for (const [fromRel, toRel] of moves) {
  if (existsSync(join(ROOT, fromRel))) {
    throw new Error(`Legacy notification layer path still exists: ${fromRel}`);
  }
  if (!existsSync(join(ROOT, toRel))) {
    throw new Error(`Canonical notification layer path is missing: ${toRel}`);
  }
}

console.log('Notification layering canonicalized: concurrency, preferences, and HTTP adapters now live under infrastructure.');
