const eslintConfigBase = require('./packages/config/eslint-base.js');

const nestjsTyped = require('@darraghor/eslint-plugin-nestjs-typed').default;
const reactPlugin = require('eslint-plugin-react');
const reactHooksPlugin = require('eslint-plugin-react-hooks');
const jsxA11yPlugin = require('eslint-plugin-jsx-a11y');

const baseConfigs = eslintConfigBase.baseConfigs.base;
const baseRules = eslintConfigBase.baseConfigs.rules;

module.exports = [
  ...baseConfigs,
  {
    ignores: ['node_modules/**', 'dist/**', 'build/**', '.turbo/**', 'apps/api/dist/**'],
  },
  {
    files: [
      'eslint.config.js',
      'packages/config/eslint-base.js',
      'packages/config/prettier.config.js',
      '.prettierrc.js',
      'packages/types/vitest.config.ts',
    ],
    languageOptions: {
      sourceType: 'commonjs',
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      'unicorn/prefer-module': 'off',
      'no-undef': 'off',
      'import/no-unresolved': 'off',
    },
  },
  {
    files: ['apps/api/**/*.{ts,tsx}'],
    plugins: {
      '@darraghor/nestjs-typed': nestjsTyped.plugin,
    },
    rules: {
      ...baseRules,
      ...nestjsTyped.configs.flatRecommended.rules,
      // @repo/* are workspace aliases resolved by TS paths; ESLint import resolver doesn't support them
      'import/no-unresolved': ['error', { ignore: ['^@repo/'] }],
    },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      'jsx-a11y': jsxA11yPlugin,
    },
    rules: {
      ...baseRules,
      ...reactPlugin.configs.flat.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      ...jsxA11yPlugin.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      // @/ is a path alias resolved by Vite/TS; ESLint import resolver doesn't support it
      'import/no-unresolved': ['error', { ignore: ['^@/'] }],
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  {
    files: ['packages/**/*.{ts,tsx}'],
    rules: {
      ...baseRules,
    },
  },
  // Must come after apps/web/**  so it takes precedence for config files
  {
    files: ['apps/web/vite.config.ts', 'apps/web/vitest.config.ts'],
    rules: {
      'import/no-unresolved': 'off',
    },
  },
  // seed.ts runs via tsx which compiles to CJS — top-level await is not supported
  {
    files: ['apps/api/prisma/seed.ts'],
    rules: {
      'unicorn/prefer-top-level-await': 'off',
    },
  },
];
