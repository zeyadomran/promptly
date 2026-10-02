import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  globalIgnores(['.vite/**', 'out/**', 'node_modules/**', 'docs/**', 'test-results/**']),
  {
    files: ['**/*.{ts,tsx,mjs}'],
    plugins: { 'simple-import-sort': simpleImportSort },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      eqeqeq: ['error', 'smart'],
      'guard-for-in': 'error',
      'no-bitwise': 'error',
      'no-caller': 'error',
      'no-debugger': 'error',
      'no-eval': 'error',
      'no-fallthrough': 'error',
      'no-new-wrappers': 'error',
      'no-undef-init': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      radix: 'error',
      'no-console': ['error', { allow: ['log', 'warn', 'error'] }]
    }
  },
  {
    files: ['**/*.mjs'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node }
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked
    ],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname }
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/dot-notation': 'off',
      '@typescript-eslint/no-deprecated': 'error',
      '@typescript-eslint/no-inferrable-types': ['error', { ignoreParameters: true }],
      '@typescript-eslint/no-shadow': ['error', { hoist: 'all' }],
      '@typescript-eslint/no-empty-object-type': 'error',
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: ['enum', 'enumMember'], format: ['camelCase', 'UPPER_CASE', 'PascalCase'] },
        {
          selector: 'default',
          format: ['camelCase', 'PascalCase'],
          leadingUnderscore: 'allow',
          trailingUnderscore: 'allow'
        },
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE', 'PascalCase', 'snake_case'],
          leadingUnderscore: 'allow',
          trailingUnderscore: 'allow'
        },
        {
          selector: 'objectLiteralProperty',
          format: ['camelCase', 'UPPER_CASE', 'PascalCase', 'snake_case'],
          leadingUnderscore: 'allowSingleOrDouble',
          trailingUnderscore: 'allowSingleOrDouble'
        },
        {
          selector: 'objectLiteralMethod',
          format: ['camelCase', 'UPPER_CASE', 'PascalCase', 'snake_case']
        },
        {
          selector: 'classProperty',
          modifiers: ['readonly'],
          format: ['camelCase', 'UPPER_CASE'],
          leadingUnderscore: 'allow',
          trailingUnderscore: 'allow'
        },
        { selector: 'typeLike', format: ['PascalCase'] },
        {
          selector: 'typeProperty',
          format: ['camelCase', 'UPPER_CASE', 'snake_case', 'PascalCase'],
          leadingUnderscore: 'allowSingleOrDouble'
        },
        { selector: 'objectLiteralProperty', modifiers: ['requiresQuotes'], format: null }
      ],
      '@typescript-eslint/strict-boolean-expressions': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
      ]
    }
  },
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules
  },
  prettier,
  {
    files: ['**/*.{ts,tsx,mjs}'],
    plugins: { '@stylistic': stylistic },
    rules: {
      '@stylistic/padding-line-between-statements': [
        'error',
        // Separate declarations from executable code, but keep declaration groups compact.
        { blankLine: 'always', prev: ['const', 'let', 'var'], next: '*' },
        { blankLine: 'any', prev: ['const', 'let', 'var'], next: ['const', 'let', 'var'] },
        // Keep control flow and standalone blocks visually distinct from adjacent statements.
        { blankLine: 'always', prev: 'block-like', next: '*' }
      ]
    }
  }
);
