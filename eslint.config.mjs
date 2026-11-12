import nextVitals from 'eslint-config-next/core-web-vitals';

const eslintConfig = [
  ...nextVitals,
  {
    rules: {
      'react-hooks/exhaustive-deps': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      '@next/next/no-page-custom-font': 'off',
      '@next/next/no-html-link-for-pages': 'warn',
    },
  },
];

export default eslintConfig;
