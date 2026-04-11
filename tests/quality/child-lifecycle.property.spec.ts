/**
 * 属性测试：子容器生命周期递归销毁不变量
 *
 * 对应原始文件：child-lifecycle.spec.ts
 * 测试目标：
 * 1. 对任意嵌套深度 d（2 ≤ d ≤ 5），destroy 根容器后所有子孙容器的 _bindings.size === 0
 *    （递归销毁不变量）
 * 2. 对任意嵌套深度，destroy 根容器后所有子孙容器的 parent 为 undefined
 *
 * Validates: Requirements 10.7
 */

import fc from 'fast-check';
import { describe, test, expect } from 'vitest';
import { Container, Token } from '@/index';

// ==================== 属性 25：递归销毁不变量 ====================

describe('Feature: fast-check-property-tests, Property 25: 递归销毁不变量', () => {
  test('对任意嵌套深度 d（2~5），destroy 根容器后所有子孙容器的 _bindings.size === 0', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 5 }),
        (depth) => {
          // 构建线性嵌套链：root -> c1 -> c2 -> ... -> c(depth-1)
          const root = new Container();
          const containers: Container[] = [root];

          // 为每个容器绑定一个 Token 并记录所有子孙容器
          const token = new Token<number>('test');
          root.bind(token).toConstantValue(0);

          let current = root;
          for (let i = 1; i < depth; i++) {
            const child = current.createChild();
            const childToken = new Token<number>(`token-${i}`);
            child.bind(childToken).toConstantValue(i);
            containers.push(child);
            current = child;
          }

          // 销毁根容器
          root.destroy();

          // 验证所有子孙容器的 _bindings.size === 0
          for (const c of containers) {
            expect((c as any)._bindings.size).toBe(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('对任意嵌套深度，destroy 根容器后所有子孙容器的 parent 为 undefined', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 5 }),
        (depth) => {
          // 构建线性嵌套链：root -> c1 -> c2 -> ... -> c(depth-1)
          const root = new Container();
          const descendants: Container[] = [];

          let current = root;
          for (let i = 1; i < depth; i++) {
            const child = current.createChild();
            descendants.push(child);
            current = child;
          }

          // 销毁根容器
          root.destroy();

          // 验证所有子孙容器的 parent 为 undefined
          for (const c of descendants) {
            expect((c as any).parent).toBeUndefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
