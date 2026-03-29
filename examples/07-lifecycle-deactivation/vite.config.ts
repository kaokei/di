import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    allowedHosts: true,
  },
  esbuild: {
    // Stage 3 装饰器依赖赋值语义的类字段初始化顺序
    // esbuild 默认忽略 tsconfig 中的 useDefineForClassFields，需在此显式指定
    useDefineForClassFields: false,
  },
});
