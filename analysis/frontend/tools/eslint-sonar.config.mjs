import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import sonarjs from 'eslint-plugin-sonarjs';

/**
 * Isolated metric-only config.  Threshold 0 intentionally reports every
 * function with non-zero cognitive/cyclomatic complexity; it is not a gate.
 * It omits spec files so the values describe production frontend code.
 */
export default [
  {
    ignores: ['src/**/*.spec.ts'],
  },
  {
    files: ['src/**/*.ts'],
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      sonarjs,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      complexity: ['warn', 0],
      'sonarjs/cognitive-complexity': ['warn', 0],
    },
  },
];
