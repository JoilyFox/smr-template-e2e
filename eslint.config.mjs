// @ts-check
// ESLint flat config (ESLint 9 / typescript-eslint 8). Uses the non-type-checked `recommended`
// preset to keep linting fast and lenient — matching the generated app's intent rather than the
// stricter type-aware ruleset. Prettier runs as an ESLint rule via its recommended integration.
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';

export default tseslint.config(
  {
    // Machine-generated, CLI-owned aggregators are rewritten on every `add` — not worth linting.
    ignores: ['dist', 'coverage', 'node_modules', 'eslint.config.mjs', 'src/generated.*.ts'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      // Allow the conventional `_`-prefix for intentionally-unused args/vars/caught errors.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
);
