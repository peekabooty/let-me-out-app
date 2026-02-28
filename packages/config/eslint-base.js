const eslint = require('@eslint/js');
const typescriptEslint = require('typescript-eslint');
const importPlugin = require('eslint-plugin-import');
const unicornPlugin = require('eslint-plugin-unicorn').default;

module.exports = {
  baseConfigs: {
    base: [
      eslint.configs.recommended,
      ...typescriptEslint.configs.recommended,
      importPlugin.flatConfigs.recommended,
      importPlugin.flatConfigs.typescript,
      unicornPlugin.configs['flat/recommended'],
    ],
    rules: {
      'unicorn/prevent-abbreviations': 'off',
      'unicorn/no-null': 'off',
      'unicorn/filename-case': 'off',
      'import/no-default-export': 'off',
    },
  },
};
