/**
 * 属性测试：错误消息不变量
 *
 * 对应原始文件：error-handling.spec.ts
 * 测试目标：验证对任意 Token 名称，BindingNotFoundError、BindingNotValidError、
 *           DuplicateBindingError 的 message 属性均包含该 Token 名称（错误消息不变量）
 *
 * Validates: Requirements 10.3
 */

import fc from 'fast-check';
import { describe, test } from 'vitest';
import { Container, Token } from '@/index';
import { BindingNotFoundError } from '@/errors/BindingNotFoundError';
import { BindingNotValidError } from '@/errors/BindingNotValidError';
import { DuplicateBindingError } from '@/errors/DuplicateBindingError';

// ==================== 属性 7：错误消息包含 Token 名称 ====================

describe('Feature: fast-check-property-tests, Property 7: 错误消息包含 Token 名称', () => {
  test('对任意 Token 名称，BindingNotFoundError 的 message 包含该名称', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        (name) => {
          const token = new Token(name);
          const error = new BindingNotFoundError(token);
          expect(error.message).toContain(name);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('对任意 Token 名称，BindingNotValidError 的 message 包含该名称', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        (name) => {
          const token = new Token(name);
          const error = new BindingNotValidError(token);
          expect(error.message).toContain(name);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('对任意 Token 名称，DuplicateBindingError 的 message 包含该名称', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        (name) => {
          const token = new Token(name);
          const error = new DuplicateBindingError(token);
          expect(error.message).toContain(name);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('对任意 Token 名称，三种错误类的 message 均包含该名称', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        (name) => {
          const container = new Container();
          try {
            const token = new Token(name);

            const notFoundError = new BindingNotFoundError(token);
            const notValidError = new BindingNotValidError(token);
            const duplicateError = new DuplicateBindingError(token);

            expect(notFoundError.message).toContain(name);
            expect(notValidError.message).toContain(name);
            expect(duplicateError.message).toContain(name);
          } finally {
            container.destroy();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('对任意 Token 名称，未绑定时 container.get 抛出 BindingNotFoundError 且消息包含名称', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        (name) => {
          const container = new Container();
          try {
            const token = new Token(name);
            let caughtError: unknown;
            try {
              container.get(token);
            } catch (e) {
              caughtError = e;
            }
            expect(caughtError).toBeInstanceOf(BindingNotFoundError);
            expect((caughtError as BindingNotFoundError).message).toContain(name);
          } finally {
            container.destroy();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
