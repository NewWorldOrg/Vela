import coreWebVitals from 'eslint-config-next/core-web-vitals'

const config = [
  // Build / tooling output — never lint generated artifacts.
  { ignores: ['.next/**', 'storybook-static/**', 'test-results/**'] },
  ...coreWebVitals,
]

export default config
