import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: ['.next/**', 'out/**', '.package-build/**', 'node_modules/**', 'public/vendor/**', 'coverage/**'],
  },
];

export default config;
