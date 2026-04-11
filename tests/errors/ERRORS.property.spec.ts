/**
 * 属性测试：tests/errors/ 目录错误处理
 *
 * 对应原始目录：tests/errors/
 * 测试目标：验证三种错误类（BindingNotFoundError、BindingNotValidError、DuplicateBindingError）
 * 在任意 Token 名称下的消息不变量，以及容器在各种错误条件下抛出正确的错误类型。
 *
 * 属性 7：错误消息包含 Token 名称（Validates: Requirements 2.1）
 * 属性 8：错误条件触发正确错误类型（Validates: Requirements 2.2, 2.3, 2.4）
 */

import fc from 'fast-check';
import { Container, Token } from '@/index';
import { BindingNotFoundError } from '@/errors/BindingNotFoundError';
import { BindingNotValidError } from '@/errors/BindingNotValidError';
import { DuplicateBindingError } from '@/errors/DuplicateBindingError';

// ==================== 属性 7：错误消息包含 Token 名称（需求 2.1） ====================

describe('Feature: fast-check-property-tests, Property 7: 错误消息包含 Token 名称', () => {
  test('对任意 Token 名称，BindingNotFoundError 的 message 包含该名称', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (tokenName) => {
        const token = new Token(tokenName);
        const error = new BindingNotFoundError(token);
        expect(error.message).toContain(tokenName);
      }),
      { numRuns: 100 }
    );
  });

  test('对任意 Token 名称，BindingNotValidError 的 message 包含该名称', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (tokenName) => {
        const token = new Token(tokenName);
        const error = new BindingNotValidError(token);
        expect(error.message).toContain(tokenName);
      }),
      { numRuns: 100 }
    );
  });

  test('对任意 Token 名称，DuplicateBindingError 的 message 包含该名称', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (tokenName) => {
        const token = new Token(tokenName);
        const error = new DuplicateBindingError(token);
        expect(error.message).toContain(tokenName);
      }),
      { numRuns: 100 }
    );
  });
});

// ==================== 属性 8：错误条件触发正确错误类型（需求 2.2, 2.3, 2.4） ====================

describe('Feature: fast-check-property-tests, Property 8: 错误条件触发正确错误类型', () => {
  test('对任意未绑定的 Token，container.get(token) 抛出 BindingNotFoundError', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (tokenName) => {
        const container = new Container();
        try {
          const token = new Token(tokenName);
          expect(() => container.get(token)).toThrow(BindingNotFoundError);
        } finally {
          container.destroy();
        }
      }),
      { numRuns: 100 }
    );
  });

  test('对任意已绑定但未调用 to* 方法的 Token，container.get(token) 抛出 BindingNotValidError', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (tokenName) => {
        const container = new Container();
        try {
          const token = new Token(tokenName);
          // 调用 bind 但不调用任何 to* 方法
          container.bind(token);
          expect(() => container.get(token)).toThrow(BindingNotValidError);
        } finally {
          container.destroy();
        }
      }),
      { numRuns: 100 }
    );
  });

  test('对任意 Token，重复调用 container.bind(token) 抛出 DuplicateBindingError', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (tokenName) => {
        const container = new Container();
        try {
          const token = new Token(tokenName);
          container.bind(token).toConstantValue('first');
          expect(() => container.bind(token)).toThrow(DuplicateBindingError);
        } finally {
          container.destroy();
        }
      }),
      { numRuns: 100 }
    );
  });
});
