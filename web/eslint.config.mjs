import coreWebVitals from 'eslint-config-next/core-web-vitals'
import typescript from 'eslint-config-next/typescript'

// eslint-config-next 16 ships native flat configs. Do NOT route these through
// FlatCompat — it re-validates them against the legacy eslintrc schema and dies
// on the circular plugin references with "Converting circular structure to JSON".
const eslintConfig = [
  ...coreWebVitals,
  ...typescript,
  {
    ignores: ['.next/**', 'out/**', 'node_modules/**', 'next-env.d.ts'],
  },
]

export default eslintConfig
