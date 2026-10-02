import coreWebVitals from 'eslint-config-next/core-web-vitals'

import vela from './scripts/eslint-rules.mjs'

const config = [
  { ignores: ['.next/**', 'storybook-static/**', 'test-results/**'] },
  ...coreWebVitals,
  {
    plugins: { vela },
    rules: {
      curly: ['error', 'all'],
      'vela/max-ternary-chain': ['error', { max: 2 }],
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    ignores: ['repository/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'openapi-fetch',
              message:
                'The generated Carina client lives in repository/client. Call a function from repository/ instead.',
            },
          ],
          patterns: [
            {
              group: [
                '@/repository/client',
                '@/repository/client/*',
                '**/repository/client',
                '**/repository/client/*',
              ],
              message:
                'The generated Carina client lives in repository/client. Call a function from repository/ instead.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['app/layout.tsx'],
    rules: {
      '@next/next/no-page-custom-font': 'off',
    },
  },
]

export default config
