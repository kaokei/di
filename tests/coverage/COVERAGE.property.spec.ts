/**
 * 属性测试：tests/coverage/ 目录
 *
 * 对应原始目录：tests/coverage/（BINDING_CIRCULAR_DYNAMIC.spec.ts 等）
 * 测试目标：验证 toDynamicValue 循环依赖始终抛出 CircularDependencyError 的错误条件属性。
 *
 * 属性 19：循环依赖错误条件（Validates: Requirements 7.2）
 */

import fc from 'fast-check';
import { Container, Token, Injectable } from '@/index';
import { CircularDependencyError } from '@/errors/CircularDependencyError';

// ==================== 属性 19：循环依赖错误条件（需求 7.2） ====================

describe('Feature: fast-check-property-tests, Property 19: 循环依赖错误条件', () => {
  test('对任意 Token 名称，toDynamicValue 中再次 get 同一 Token 始终抛出 CircularDependencyError', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (tokenName) => {
        const container = new Container();
        try {
          const token = new Token<unknown>(tokenName);
          container.bind(token).toDynamicValue((context) => {
            // 在工厂函数中再次 get 同一 token，触发循环依赖
            return context.container.get(token);
          });

          expect(() => container.get(token)).toThrow(CircularDependencyError);
        } finally {
          container.destroy();
        }
      }),
      { numRuns: 100 }
    );
  });
});
