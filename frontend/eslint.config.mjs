import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';

// Flat config — ESLint 9 + Next.js 16. `next lint` was removed in Next 16,
// so we wire eslint-config-next directly. Each entry already returns a
// flat-config array, hence the spread.
//
// The four `react-hooks/*` rules below are part of the React 19 / React
// Compiler ruleset that ships with Next 16. They flag patterns (calling a
// memoised fetcher from useEffect, async setState inside event handlers)
// that the project already uses consistently in `useTasks` and friends.
// We surface them as warnings rather than errors so they show up during
// review without breaking the build, instead of forcing a wholesale hook
// refactor that is outside the scope of this change.
const config = [
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/refs': 'warn',
    },
  },
  {
    ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'],
  },
];

export default config;
