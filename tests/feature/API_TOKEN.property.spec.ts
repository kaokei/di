/**
 * 属性测试文件
 * 对应原始文件：API_TOKEN.spec.ts
 * 测试目标：验证 Token 构造函数的通用正确性属性
 *
 * 属性 1：Token 名称 round-trip
 *   对任意非空字符串 name，new Token(name).name 严格等于 name
 *   Token 实例不含名为 _ 的自有属性
 *   Token 实例的自有属性仅包含 name
 *
 * Validates: Requirements 1.2
 */

import fc from 'fast-check';
import { Token } from '@/index';

describe('Feature: fast-check-property-tests, Property 1: Token 名称不变量', () => {
  test('对任意非空字符串名称，new Token(name).name 严格等于传入的名称', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (name) => {
        const token = new Token(name);
        expect(token.name).toBe(name);
      }),
      { numRuns: 100 }
    );
  });

  test('Token 实例不含名为 _ 的自有属性', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (name) => {
        const token = new Token(name);
        expect(Object.hasOwn(token, '_')).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  test('Token 实例的自有属性仅包含 name', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (name) => {
        const token = new Token(name);
        expect(Object.keys(token)).toEqual(['name']);
      }),
      { numRuns: 100 }
    );
  });
});
