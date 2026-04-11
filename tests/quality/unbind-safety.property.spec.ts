/**
 * 属性测试：unbindAll 批量清理不变量
 *
 * 对应原始文件：unbind-safety.spec.ts
 * 测试目标：
 * 1. 对任意数量（1~20）的 Token，unbindAll 后 _bindings.size === 0（批量清理不变量）
 * 2. 对任意数量的 Token，unbindAll 后所有 Token 的 isCurrentBound 均返回 false
 *
 * Validates: Requirements 10.5
 */

import fc from 'fast-check';
import { describe, test, expect } from 'vitest';
import { Container, Token } from '@/index';

// ==================== 属性 20：unbindAll 批量清理不变量 ====================

describe('Feature: fast-check-property-tests, Property 20: unbindAll 批量清理不变量', () => {
  test('对任意数量（1~20）的 Token，unbindAll 后 _bindings.size === 0', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        (count) => {
          const container = new Container();
          try {
            // 创建 count 个 Token 并绑定常量值
            const tokens: Token<number>[] = [];
            for (let i = 0; i < count; i++) {
              const token = new Token<number>(`token-${i}`);
              tokens.push(token);
              container.bind(token).toConstantValue(i);
            }

            // 验证绑定数量正确
            expect((container as any)._bindings.size).toBe(count);

            // 执行 unbindAll
            container.unbindAll();

            // 验证 _bindings.size === 0
            expect((container as any)._bindings.size).toBe(0);
          } finally {
            container.destroy();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('对任意数量的 Token，unbindAll 后所有 Token 的 isCurrentBound 均返回 false', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        (count) => {
          const container = new Container();
          try {
            // 创建 count 个 Token 并绑定常量值
            const tokens: Token<number>[] = [];
            for (let i = 0; i < count; i++) {
              const token = new Token<number>(`token-${i}`);
              tokens.push(token);
              container.bind(token).toConstantValue(i);
            }

            // 验证绑定前所有 Token 均已绑定
            for (const token of tokens) {
              expect(container.isCurrentBound(token)).toBe(true);
            }

            // 执行 unbindAll
            container.unbindAll();

            // 验证所有 Token 的 isCurrentBound 均返回 false
            for (const token of tokens) {
              expect(container.isCurrentBound(token)).toBe(false);
            }
          } finally {
            container.destroy();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
