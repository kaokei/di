/**
 * 属性测试：Token 改进不变量
 *
 * 对应原始文件：token-improvement.spec.ts
 * 测试目标：
 * 1. 对任意非空字符串，new Token(name).name === name（round-trip 属性）
 * 2. Token 实例不含 `_` 自有属性（Object.hasOwn(token, '_') === false）（不变量）
 *
 * Validates: Requirements 10.4
 */

import fc from 'fast-check';
import { describe, test } from 'vitest';
import { Token } from '@/index';

// ==================== 属性 1：Token 名称 round-trip ====================

describe('Feature: fast-check-property-tests, Property 1: Token 名称 round-trip', () => {
  test('对任意非空字符串，new Token(name).name 严格等于传入的名称', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        (name) => {
          const token = new Token(name);
          expect(token.name).toBe(name);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('对任意非空字符串，Token 实例不含 _ 自有属性', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        (name) => {
          const token = new Token(name);
          // declare 关键字不产生运行时代码，实例上不应有 _ 属性
          expect(Object.hasOwn(token, '_')).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('对任意非空字符串，Token 实例的自有属性仅包含 name', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        (name) => {
          const token = new Token(name);
          const ownKeys = Object.keys(token);
          expect(ownKeys).toEqual(['name']);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('对任意非空字符串，不同名称创建的 Token 实例互相独立', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        (name1, name2) => {
          const token1 = new Token(name1);
          const token2 = new Token(name2);
          // 两个 Token 实例始终不同（引用不等）
          expect(token1).not.toBe(token2);
          // 各自的 name 属性正确
          expect(token1.name).toBe(name1);
          expect(token2.name).toBe(name2);
        }
      ),
      { numRuns: 100 }
    );
  });
});
