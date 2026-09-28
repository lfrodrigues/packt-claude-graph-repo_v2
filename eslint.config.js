import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      'node_modules',
      'dist',
      'coverage',
      'graph/**/*.js',
      'chapters/**',
      // A worktree is a full copy of the repo. Without this, every run's lane
      // gets linted as part of the main checkout — and the graph scripts are
      // workflow scripts, whose globals (agent, phase, args) are injected by
      // the runtime, so they fail no-undef and turn `npm run verify` red.
      // The Stop hook runs verify, so that would hang every agent turn.
      '.claude/worktrees/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  { rules: { '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }] } }
);
