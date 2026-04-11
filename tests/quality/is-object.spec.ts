/**
 * 单元测试：isObject 工具函数
 *
 * 对应源文件：src/constants.ts
 * 测试目标：验证 isObject 对各类输入的判断正确性
 *
 * isObject(val) 的语义：
 *   - val !== null && typeof val === 'object'
 *   - 即：排除 null，接受所有 object 类型（普通对象、数组、Date 等）
 */

import fc from 'fast-check';
import { describe, test, expect } from 'vitest';
import { isObject } from '@/constants';

// ==================== 示例测试 ====================

describe('isObject - 示例测试', () => {
  test('普通对象返回 true', () => {
    expect(isObject({})).toBe(true);
    expect(isObject({ a: 1 })).toBe(true);
  });

  test('数组返回 true', () => {
    expect(isObject([])).toBe(true);
    expect(isObject([1, 2, 3])).toBe(true);
  });

  test('Date 返回 true', () => {
    expect(isObject(new Date())).toBe(true);
  });

  test('Map / Set 返回 true', () => {
    expect(isObject(new Map())).toBe(true);
    expect(isObject(new Set())).toBe(true);
  });

  test('null 返回 false', () => {
    expect(isObject(null)).toBe(false);
  });

  test('undefined 返回 false', () => {
    expect(isObject(undefined)).toBe(false);
  });

  test('字符串返回 false', () => {
    expect(isObject('')).toBe(false);
    expect(isObject('hello')).toBe(false);
  });

  test('数字返回 false', () => {
    expect(isObject(0)).toBe(false);
    expect(isObject(42)).toBe(false);
    expect(isObject(NaN)).toBe(false);
  });

  test('布尔值返回 false', () => {
    expect(isObject(true)).toBe(false);
    expect(isObject(false)).toBe(false);
  });

  test('Symbol 返回 false', () => {
    expect(isObject(Symbol())).toBe(false);
  });

  test('函数返回 false（typeof function === "function"，不是 "object"）', () => {
    expect(isObject(() => {})).toBe(false);
    expect(isObject(function () {})).toBe(false);
  });
});

// ==================== 属性测试 ====================

describe('isObject - 属性测试', () => {
  test('任意对象（非 null）均返回 true', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.object(),
          fc.array(fc.anything()),
          fc.constant(new Date()),
          fc.constant(new Map()),
          fc.constant(new Set()),
        ),
        (val) => {
          expect(isObject(val)).toBe(true);
        }
      ),
      { numRuns: 200 }
    );
  });

  test('任意原始值（string / integer / boolean）均返回 false', () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.string(), fc.integer(), fc.boolean()),
        (val) => {
          expect(isObject(val)).toBe(false);
        }
      ),
      { numRuns: 200 }
    );
  });

  test('null 始终返回 false（不变量）', () => {
    expect(isObject(null)).toBe(false);
  });

  test('isObject 与 (val !== null && typeof val === "object") 语义完全一致', () => {
    fc.assert(
      fc.property(
        fc.anything(),
        (val) => {
          const expected = val !== null && typeof val === 'object';
          expect(isObject(val)).toBe(expected);
        }
      ),
      { numRuns: 500 }
    );
  });
});
