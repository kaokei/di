/**
 * 属性测试：容器查找链优先级与传递性不变量
 *
 * 对应原始文件：container-get.spec.ts
 * 测试目标：
 * 1. 对任意 Token 名称，子容器绑定优先于父容器绑定（查找链优先级不变量）
 * 2. 对任意 Token 名称，子容器未绑定时从父容器解析（查找链传递性）
 *
 * Validates: Requirements 10.6
 */

import fc from 'fast-check';
import { describe, test, expect } from 'vitest';
import { Container, Token } from '@/index';

// ==================== 属性 16：父子容器查找链优先级 ====================

describe('Feature: fast-check-property-tests, Property 16: 父子容器查找链优先级', () => {
  test('对任意 Token 名称，子容器绑定优先于父容器绑定', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.oneof(fc.string(), fc.integer(), fc.boolean()),
        fc.oneof(fc.string(), fc.integer(), fc.boolean()),
        (name, parentValue, childValue) => {
          const parent = new Container();
          try {
            const token = new Token<typeof parentValue>(name);
            parent.bind(token).toConstantValue(parentValue);

            const child = parent.createChild();
            child.bind(token).toConstantValue(childValue);

            // 子容器绑定优先：从子容器 get 应返回子容器的值
            const result = child.get(token);
            expect(result).toBe(childValue);

            // 父容器不受影响：从父容器 get 仍返回父容器的值
            const parentResult = parent.get(token);
            expect(parentResult).toBe(parentValue);
          } finally {
            parent.destroy();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('对任意 Token 名称，子容器未绑定时从父容器解析（查找链传递性）', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.oneof(fc.string(), fc.integer(), fc.boolean()),
        (name, parentValue) => {
          const parent = new Container();
          try {
            const token = new Token<typeof parentValue>(name);
            parent.bind(token).toConstantValue(parentValue);

            // 子容器不绑定该 Token
            const child = parent.createChild();

            // 子容器未绑定时，应从父容器解析
            expect(child.isCurrentBound(token)).toBe(false);
            const result = child.get(token);
            expect(result).toBe(parentValue);
          } finally {
            parent.destroy();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
