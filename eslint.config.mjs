import coreWebVitals from 'eslint-config-next/core-web-vitals'

const config = [
  // Build / tooling output — never lint generated artifacts.
  { ignores: ['.next/**', 'storybook-static/**', 'test-results/**'] },
  ...coreWebVitals,
  {
    rules: {
      curly: ['error', 'all'],
    },
  },
  {
    files: ['app/layout.tsx'],
    rules: {
      // The rule guards against a font link in a single page. The root layout
      // applies to every route, which is the App Router equivalent of the
      // _document the rule asks for.
      '@next/next/no-page-custom-font': 'off',
    },
  },
]

export default config
