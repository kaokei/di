/**
 * 属性测试：toConstantValue round-trip 不变量
 *
 * 对应原始文件：regression.spec.ts
 * 测试目标：
 * 1. 对任意常量值（包括 null 和 undefined），`bind(token).toConstantValue(v)` 后 `get(token) === v`（round-trip 属性）
 *
 * Validates: Requirements 10.8
 */

import fc from 'fast-check';
import { describe, test, expect } from 'vitest';
import { Container, Token } from '@/index';

// ==================== 属性 2：toConstantValue round-trip ====================

describe('Feature: fast-check-property-tests, Property 2: toConstantValue round-trip', () => {
  test('对任意常量值（含 null/undefined），bind(token).toConstantValue(v) 后 get(token) === v', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.oneof(
          fc.string(),
          fc.integer(),
          fc.boolean(),
          fc.constant(null),
          fc.constant(undefined)
        ),
        (name, value) => {
          const container = new Container();
          try {
            const token = new Token<typeof value>(name);
            container.bind(token).toConstantValue(value);
            const result = container.get(token);
            expect(result).toBe(value);
          } finally {
            container.destroy();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
