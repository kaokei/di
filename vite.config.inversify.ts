/// <reference types="vitest/config" />

import { resolve } from 'path';
import { defineConfig } from 'vite';
import swc from 'unplugin-swc';

// 专门用于运行 tests/inversify 目录下的单元测试
// inversify v6.2.2 使用 Stage 1 装饰器，需要通过 SWC 启用 experimentalDecorators 和 emitDecoratorMetadata
export default defineConfig({
  plugins: [
    swc.vite({
      jsc: {
        parser: {
          syntax: 'typescript',
          decorators: true,
        },
        transform: {
          legacyDecorator: true,
          decoratorMetadata: true,
        },
      },
    }),
  ],
  test: {
    globals: true,
    dangerouslyIgnoreUnhandledErrors: true,
    // 只包含 inversify 测试目录
    include: ['tests/inversify/**/*.spec.ts'],
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
