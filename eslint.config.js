const nextPlugin = require('@next/eslint-plugin-next');
const tsParser = require('@typescript-eslint/parser');

module.exports = [
  {
    ignores: [
      'out/**',
      '.next/**',
      '**/.next/**',
      'node_modules/**',
      'android/**',
      'ios/**',
      'public/**',
      'eslint-plugin-asol/**',
      '.claude/**',
      '.devin/**',
      'tmp/**',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx', '**/*.cjs', '**/*.mjs'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      'no-restricted-globals': [
        'error',
        {
          name: 'localStorage',
          message: 'Do not use localStorage. Use AsolDB/IndexedDB abstraction (asolDbGet/asolDbSet) or the approved preferences service instead.'
        }
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'window',
          property: 'localStorage',
          message: 'Do not use localStorage. Use AsolDB/IndexedDB abstraction (asolDbGet/asolDbSet) or the approved preferences service instead.'
        },
        {
          object: 'globalThis',
          property: 'localStorage',
          message: 'Do not use localStorage. Use AsolDB/IndexedDB abstraction (asolDbGet/asolDbSet) or the approved preferences service instead.'
        }
      ]
    }
  }
  ,
  {
    files: ['src/**/*.{ts,tsx,js,jsx,cjs,mjs}', 'scripts/**/*.{ts,tsx,js,jsx,cjs,mjs}'],
    ignores: ['scripts/architecture-check.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'better-sqlite3', message: 'Database drivers belong to @asol/data-core only.' },
            { name: '@libsql/client', message: 'Database drivers belong to @asol/data-core only.' },
            { name: 'drizzle-orm', message: 'Database query APIs belong to @asol/data-core only.' },
          ],
          patterns: [
            { group: ['@libsql/*', 'drizzle-orm/*'], message: 'Database query APIs belong to @asol/data-core only.' },
            {
              group: ['@asol/data-core/src/**', '@asol/data-core/src', '**/packages/data-core/**'],
              message:
                'Deep import into @asol/data-core is forbidden. Use a declared door: @asol/data-core, /core, /browser, /telemetry, /provisioning, /tooling, or /<domain>.',
            },
            {
              group: ['@asol/orders-core/**', '**/packages/orders-core/**'],
              message:
                'The order domain has exactly one door. Import from @asol/orders-core, never a sub-path.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'localStorage', message: 'Use the approved AsolDB or preferences adapter.' },
        { name: 'indexedDB', message: 'Use the central browser adapter behind @asol/data-core/browser.' },
      ],
    },
  },
  // ── @asol/native-core architecture sealing ────────────────────────────────
  // Capacitor imports are banned outside native-core (app, services, scripts, and
  // every other package). Root capacitor.config.ts is owned via ROOT_VENDOR_OWNED_FILES.
  {
    files: [
      'src/**/*.{ts,tsx,js,jsx}',
      'services/**/*.{ts,tsx,js,jsx}',
      'scripts/**/*.ts',
      'packages/**/*.{ts,tsx,js,jsx}',
    ],
    ignores: [
      'packages/native-core/**',
      'packages/architecture-core/**',
      'scripts/architecture-check.ts',
      'capacitor.config.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@capacitor/*', '@capawesome/*', '@capgo/*', '@capacitor-mlkit/*'],
              message:
                'Direct Capacitor imports are forbidden outside @asol/native-core. Use @asol/native-core instead.',
            },
            {
              // The package has three declared doors — `.`, `./platform-globals`, and the R8
              // policy validator — and a deep import into its source is what must not resolve.
              // Banning every sub-path also banned the doors, which is why the configuration
              // leaf that needs platform identity without a Capacitor dependency could not be
              // written against one.
              group: ['@asol/native-core/src/**', '**/packages/native-core/src/**'],
              message:
                'Deep import into @asol/native-core is forbidden. Use a declared door: ' +
                '@asol/native-core or @asol/native-core/platform-globals.',
            },
            {
              group: [
                '@asol/vercel-deploy-core/*',
                '@asol/service-mirror-core/*',
                '@asol/account-bridge/src/**',
                '@asol/*-composition/*',
              ],
              message:
                'Deep import into sealed capability package is forbidden. Import from declared package root or doors.',
            },
            {
              group: [
                '**/packages/vercel-deploy-core/**',
                '**/packages/service-mirror-core/**',
                '**/packages/account-bridge/**',
                '**/packages/*-composition/**',
              ],
              message:
                'Relative path traversal into packages/ is forbidden. Use package specifier @asol/<package>.',
            },
            {
              group: ['@asol/storage-core/src/**', '@asol/storage-core/src', '@asol/storage-core/server/**'],
              message:
                'Import from @asol/storage-core or @asol/storage-core/server only, not from deep sub-paths.',
            },
            {
              group: [
                '@/features/ota',
                '@/features/ota/**',
                'scripts/ota',
                'scripts/ota/**',
                'scripts/ota-publish',
                'scripts/ota-publish/**',
                'scripts/build-static',
                'scripts/build-static/**',
                '@/features/release-commands/domain/content-version',
              ],
              message:
                'OTA has been consolidated into @asol/ota-core. Import from @asol/ota-core or @asol/ota-core/publishing.',
            },
          ],
        },
      ],
    },
  },
  // ── @asol/ota-core runtime sealing ────────────────────────────────────────
  // Runtime domain & client services must NOT import Node builtins or publishing half.
  {
    files: [
      'packages/ota-core/src/domain/**/*.{ts,tsx}',
      'packages/ota-core/src/errors/**/*.{ts,tsx}',
      'packages/ota-core/src/validation/**/*.{ts,tsx}',
      'packages/ota-core/src/runtime/**/*.{ts,tsx}',
      'packages/ota-core/src/index.ts',
    ],
    ignores: [
      'packages/ota-core/src/runtime/release-service.server.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'fs', message: 'Browser/runtime OTA code must not import fs.' },
            { name: 'node:fs', message: 'Browser/runtime OTA code must not import node:fs.' },
            { name: 'path', message: 'Browser/runtime OTA code must not import path.' },
            { name: 'node:path', message: 'Browser/runtime OTA code must not import node:path.' },
            { name: 'child_process', message: 'Browser/runtime OTA code must not import child_process.' },
            { name: 'node:child_process', message: 'Browser/runtime OTA code must not import node:child_process.' },
            { name: '@asol/ota-core/publishing', message: 'Browser/runtime OTA code must not import publishing half.' },
          ],
          patterns: [
            {
              group: ['node:*'],
              message: 'Browser/runtime OTA code must not import Node builtins.',
            },
          ],
        },
      ],
    },
  },
  // ── @aws-sdk / google-auth-library adapter sealing ────────────────────────
  // Dual ownership is intentional: storage-core + ota-core for S3; notifications-core
  // (FCM HTTP v1) + ota-core (Play) for google-auth-library. firebase-admin is not a
  // production path and remains banned everywhere.
  {
    files: [
      'src/**/*.{ts,tsx}',
      'scripts/**/*.ts',
      'services/**/*.{ts,tsx}',
      'packages/**/*.{ts,tsx}',
    ],
    ignores: [
      'packages/storage-core/**',
      'packages/ota-core/**',
      'packages/notifications-core/**',
      'packages/architecture-core/**',
      'services/*/generated/**',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@aws-sdk/*', '@aws-sdk'],
              message:
                '@aws-sdk belongs to @asol/storage-core and @asol/ota-core only. Import through those package doors.',
            },
            {
              group: ['google-auth-library'],
              message:
                'google-auth-library belongs to @asol/notifications-core (FCM) and @asol/ota-core/publishing (Play). Do not import it elsewhere.',
            },
          ],
        },
      ],
    },
  },

  // ── Repository-wide deep-import ban for every sealed @asol package ─────────
  // Vendor ownership, mirroring packages/architecture-core/src/registry/
  // capability-registry.ts. The registry is the authority; this rule is the
  // editor-time echo of it, and the two must name the same owners — a rule that
  // fires inside the package that owns the SDK is not enforcement, it is a
  // broken build. `data-core` owns the database drivers and drizzle,
  // `notifications-core` owns web-push and firebase-admin.
  {
    files: ['src/**/*.{ts,tsx}', 'scripts/**/*.ts', 'services/**/*.{ts,tsx}', 'packages/**/*.{ts,tsx}'],
    ignores: [
      'services/*/generated/**',
      'scripts/architecture-check.ts',
      'packages/data-core/**',
      'packages/notifications-core/**',
      'packages/architecture-core/**',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@asol/*/src', '@asol/*/src/**', '**/packages/*/src/**'],
              message:
                'Deep import into a sealed @asol package is forbidden. Use a declared package door only.',
            },
            {
              // Sub-paths only. The bare names are matched as exact `paths`
              // below: as a pattern, `web-push` also matched the relative
              // import `../infrastructure/web-push/web-push-browser.service`,
              // flagging a module for importing its own adapter.
              group: ['drizzle-orm/*', '@libsql/*'],
              message:
                'This vendor SDK is owned by a sealed package. Import through that package public door.',
            },
          ],
          paths: [
            'web-push',
            'firebase-admin',
            'better-sqlite3',
            '@libsql/client',
            'drizzle-orm',
          ].map((name) => ({
            name,
            message:
              'This vendor SDK is owned by a sealed package. Import through that package public door.',
          })),
        },
      ],
    },
  },
];
