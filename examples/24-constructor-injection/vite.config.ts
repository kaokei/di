import { defineConfig } from 'vite';
import { babel } from '@rollup/plugin-babel';

export default defineConfig({
  server: {
    allowedHosts: true,
  },
  plugins: [
    babel({
      babelHelpers: 'bundled',
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
      plugins: [
        ['@babel/plugin-proposal-decorators', { version: '2023-11' }],
      ],
    }),
  ],
});
