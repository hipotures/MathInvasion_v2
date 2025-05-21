import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import importPlugin from 'eslint-plugin-import';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      import: importPlugin,
    },
    rules: {
      ...importPlugin.configs.recommended.rules,
      ...importPlugin.configs.typescript.rules,
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
          pathGroups: [
            { pattern: 'react', group: 'external', position: 'before' },
            { pattern: 'phaser', group: 'external', position: 'before' },
          ],
          pathGroupsExcludedImportTypes: ['react', 'phaser'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json',
        },
        node: true,
      },
    },
  },
  eslintPluginPrettierRecommended, // Make sure this is last
  { // Custom rules and global ignores
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      'no-console': 'warn',
      // Add other project-specific rules here if needed
    },
    languageOptions: {
      globals: {
        browser: true,
        es2020: true,
        node: true,
        // Add other globals if needed (e.g., for testing frameworks)
      },
    },
    ignores: ['dist/', 'node_modules/', '*.config.js', '*.config.ts', '.husky/'], // Ignore build, deps, configs, husky dir
  }
);
