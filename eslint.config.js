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
];
