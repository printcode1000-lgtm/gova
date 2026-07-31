const nextPlugin = require('@next/eslint-plugin-next');
const tsParser = require('@typescript-eslint/parser');

module.exports = [
  {
    ignores: [
      'out/**',
      '.next/**',
      'node_modules/**',
      'android/**',
      'ios/**',
      'public/**',
      'eslint-plugin-asol/**',
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
  }
];
