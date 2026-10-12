import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import n from 'eslint-plugin-n';
import security from 'eslint-plugin-security';

export default defineConfig([
  globalIgnores(['.remember/', 'graphify-out/', '.husky/_/']),
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
  }
]);
