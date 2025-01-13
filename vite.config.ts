/// <reference types="vitest/config" />

// 参考：https://innei.in/posts/tech/write-a-universally-compatible-js-library-with-fully-types
// 参考：https://arethetypeswrong.github.io/
// 作为library是没有必要压缩的，除非需要输出umd格式给浏览器端使用
// 注意vue等库都是peerDependencies，不应该打包到当前库中
import { resolve } from 'path';
import { outputFileSync } from 'fs-extra/esm';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    dts({
      // rollupTypes: true,
      include: ["./src"],
      tsconfigPath: './tsconfig.app.json',
      beforeWriteFile: (filePath, content) => {
        outputFileSync(filePath.replace('.d.ts', '.d.cts'), content);
        return { filePath, content };
      },
    }),
  ],
  build: {
    lib: {
      // Could also be a dictionary or array of multiple entry points
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'DI',
      // the proper extensions will be added
      fileName: 'index',
      formats: ['cjs', 'es'],
    },
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: ['vue'],
      output: {
        compact: true,
      },
    },
  },
  test: {
    globals: true,
    coverage: {
      include: ['src/**/*.ts'],
      reporter: ['text', 'lcov'],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@tests': resolve(__dirname, './tests'),
    },
  },
});
