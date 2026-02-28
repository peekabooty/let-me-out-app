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
];
