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
    ignores: ['src/modules/data-access/**', 'scripts/architecture-check.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'better-sqlite3', message: 'Database drivers belong to src/modules/data-access only.' },
            { name: '@libsql/client', message: 'Database drivers belong to src/modules/data-access only.' },
            { name: 'drizzle-orm', message: 'Database query APIs belong to src/modules/data-access only.' },
          ],
          patterns: [
            { group: ['@libsql/*', 'drizzle-orm/*'], message: 'Database query APIs belong to src/modules/data-access only.' },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'localStorage', message: 'Use the approved AsolDB or preferences adapter.' },
        { name: 'indexedDB', message: 'Use the central browser adapter in src/modules/data-access/browser.' },
      ],
    },
  },
  // ── @asol/native-core architecture sealing ────────────────────────────────
  // All Capacitor imports are banned in app code. Only the adapters layer
  // inside packages/native-core may import them directly.
  {
    files: [
      'src/**/*.{ts,tsx,js,jsx}',
      'services/**/*.{ts,tsx,js,jsx}',
      'scripts/**/*.ts',
    ],
    ignores: [
      'packages/native-core/src/adapters/**',
      'packages/native-core/scripts/**',
      'scripts/architecture-check.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@capacitor/*', '@capawesome/*', '@capgo/*', '@capacitor-mlkit/*'],
              message:
                'Direct Capacitor imports are forbidden in app code. Use @asol/native-core instead.',
            },
            {
              group: ['@asol/native-core/*'],
              message:
                'Import from @asol/native-core only (root), not from sub-paths.',
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
                '@/modules/release-commands/domain/content-version',
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
  // ── @asol/ota-core adapter sealing ───────────────────────────────────────
  // @aws-sdk/* and google-auth-library are Node-only, heavy dependencies.
  // They belong exclusively in the ota-core adapters layer.
  // Narrow exceptions:
  //   - src/core/provisioning/r2-s3-client.ts: general-purpose R2 client for non-OTA storage
  //   - src/features/notifications/services/providers/fcm-http-v1.server.ts: FCM HTTP v1 auth
  //   - src/modules/google-play-console/services/google-play-console-service.server.ts:
  //     uses GoogleAuth as HTTP client only; credential resolution is via @asol/ota-core/publishing
  {
    files: [
      'src/**/*.{ts,tsx}',
      'scripts/**/*.ts',
      'services/**/*.{ts,tsx}',
    ],
    ignores: [
      'packages/ota-core/src/publishing/adapters/**',
      'src/core/provisioning/r2-s3-client.ts',
      'src/features/notifications/services/providers/fcm-http-v1.server.ts',
      'src/modules/google-play-console/services/google-play-console-service.server.ts',
      // Same pattern as the console service above: GoogleAuth is the HTTP client,
      // while the credentials themselves come from @asol/ota-core/publishing.
      'src/modules/google-play-console/services/google-play-store-assets-service.server.ts',
      // Generated mirrors of the exempt sources above. `sync-*-service-sources.ts`
      // copies them verbatim into each service tree, so linting the copy re-reports
      // a violation already answered at its source. They are gitignored output.
      'services/*/generated/**',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@aws-sdk/*', '@aws-sdk'],
              message: '@aws-sdk belongs exclusively to packages/ota-core/src/publishing/adapters. Use @asol/ota-core/publishing for OTA storage operations.',
            },
            {
              group: ['google-auth-library'],
              message: 'google-auth-library belongs to packages/ota-core/src/publishing/adapters. Use resolveGooglePlayCredentials from @asol/ota-core/publishing.',
            },
          ],
        },
      ],
    },
  },
];
