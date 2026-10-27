import js from '@eslint/js';
import json from '@eslint/json';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import n from 'eslint-plugin-n';
import security from 'eslint-plugin-security';
import eslintConfigPrettier from 'eslint-config-prettier/flat';

export default defineConfig([
  globalIgnores(['.remember/', 'graphify-out/', '.husky/_/', 'node_modules/', 'package-lock.json']),
  {
    files: ['**/*.{js,mjs,cjs}'],
    plugins: { js },
    extends: ['js/recommended'],
    languageOptions: { globals: globals.node }
  },
  {
    files: ['**/*.mjs'],
    extends: [n.configs['flat/recommended-module'], security.configs.recommended],
    rules: {
      'n/prefer-node-protocol': 'error',
      // Hooks signal block/allow through exit codes (.claude/rules/hooks.md).
      'n/no-process-exit': 'off',
      // Path containment is checked by hand (.claude/rules/es-modules.md); these two rules flag every dynamic path and key.
      'security/detect-non-literal-fs-filename': 'off',
      'security/detect-object-injection': 'off'
    }
  },
  {
    files: ['**/*.json'],
    plugins: { json },
    language: 'json/json',
    extends: ['json/recommended']
  },
  {
    files: ['**/*.jsonc'],
    plugins: { json },
    language: 'json/jsonc',
    extends: ['json/recommended']
  },
  eslintConfigPrettier
]);
