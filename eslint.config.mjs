import next from 'eslint-config-next'
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

/**
 * ESLint, flat config.
 *
 * `npm run lint` existed in package.json from the start but had never worked —
 * neither eslint nor a config was installed, so it failed with "'eslint' is not
 * recognized" rather than with lint results. That is worse than having no
 * script: a broken check reads as a passing one to anyone who does not run it.
 *
 * SCOPE. This is a first run over ~390 files that have never been linted, so
 * the rules below are deliberately the ones that catch REAL problems — hook
 * dependency mistakes, unreachable code, Next.js routing and image errors —
 * and not stylistic preference. Formatting disagreements across a codebase
 * this size would bury the findings that matter, and nothing here is
 * auto-formatted today.
 *
 * Anything downgraded to a warning below is a real signal that is too noisy to
 * block on right now. Warnings still print; they simply do not fail the run.
 */
const config = [
  ...next,
  ...nextCoreWebVitals,
  ...nextTypescript,

  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
      // Generated: bundles produced by scripts/bundle-work-migrations.mjs and
      // anything else emitted rather than written.
      'apply-*.sql',
      'verify-*.sql',
    ],
  },

  {
    rules: {
      // `any` is load-bearing at exactly one boundary in this codebase: the
      // Supabase query layer, where lib/work/types/database.ts is still the
      // permissive placeholder. Those casts are commented where they happen.
      // Flag them as warnings so regenerating the types later has a to-do list.
      '@typescript-eslint/no-explicit-any': 'warn',

      // Unused code is worth seeing but is not a defect. The leading-underscore
      // exemption matches the `_prev` convention every server action uses for
      // the useActionState signature it must accept but never reads.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
]

export default config
