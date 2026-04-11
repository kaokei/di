/**
 * 属性测试：CacheMap 类型安全 round-trip 不变量
 *
 * 对应原始文件：cachemap-type-safety.spec.ts
 * 测试目标：验证对任意属性名称集合，defineMetadata 写入后 getInjectedProps 读取的结果
 *           与写入值一致（round-trip 属性）
 *
 * Validates: Requirements 10.2
 */

import fc from 'fast-check';
import { describe, test } from 'vitest';
import { defineMetadata, getInjectedProps } from '@/cachemap';
import { KEYS } from '@/constants';

// ==================== 属性 24：cachemap round-trip ====================

describe('Feature: fast-check-property-tests, Property 24: cachemap round-trip', () => {
  test('对任意属性名称集合，defineMetadata 写入后 getInjectedProps 读取结果与写入值一致', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.string({ minLength: 1 }).filter(s => !(s in Object.prototype)),
          { minLength: 1, maxLength: 5 }
        ),
        (propNames) => {
          // 每次迭代创建新类，避免状态污染
          class Target {}

          // 构造写入的元数据：每个属性名对应一个 inject 对象
          const injectedProps: Record<string, Record<string, unknown>> = {};
          for (const propName of propNames) {
            injectedProps[propName] = { inject: Target };
          }

          defineMetadata(Target, { [KEYS.INJECTED_PROPS]: injectedProps });

          // 读取并验证 round-trip
          const result = getInjectedProps(Target);
          expect(result).toBeDefined();

          for (const propName of propNames) {
            expect(result).toHaveProperty(propName);
            expect(result![propName]).toEqual({ inject: Target });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('对任意属性名称集合，写入的属性数量与读取的属性数量一致（无多余属性）', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.string({ minLength: 1 }).filter(s => !(s in Object.prototype)),
          { minLength: 1, maxLength: 5 }
        ),
        (propNames) => {
          class Target {}

          // 去重，避免重复属性名导致计数不一致
          const uniqueNames = [...new Set(propNames)];

          const injectedProps: Record<string, Record<string, unknown>> = {};
          for (const propName of uniqueNames) {
            injectedProps[propName] = { inject: Target };
          }

          defineMetadata(Target, { [KEYS.INJECTED_PROPS]: injectedProps });

          const result = getInjectedProps(Target);
          expect(result).toBeDefined();
          // 读取的属性数量应与写入的唯一属性数量一致
          expect(Object.keys(result!).length).toBe(uniqueNames.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('不同类的 defineMetadata 写入互不干扰', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.string({ minLength: 1 }).filter(s => !(s in Object.prototype)),
          { minLength: 1, maxLength: 3 }
        ),
        fc.array(
          fc.string({ minLength: 1 }).filter(s => !(s in Object.prototype)),
          { minLength: 1, maxLength: 3 }
        ),
        (propsA, propsB) => {
          class ClassA {}
          class ClassB {}

          const metaA: Record<string, Record<string, unknown>> = {};
          for (const p of propsA) {
            metaA[p] = { inject: ClassA };
          }

          const metaB: Record<string, Record<string, unknown>> = {};
          for (const p of propsB) {
            metaB[p] = { inject: ClassB };
          }

          defineMetadata(ClassA, { [KEYS.INJECTED_PROPS]: metaA });
          defineMetadata(ClassB, { [KEYS.INJECTED_PROPS]: metaB });

          const resultA = getInjectedProps(ClassA);
          const resultB = getInjectedProps(ClassB);

          // ClassA 的元数据中 inject 应为 ClassA
          for (const p of propsA) {
            expect(resultA![p]?.inject).toBe(ClassA);
          }

          // ClassB 的元数据中 inject 应为 ClassB
          for (const p of propsB) {
            expect(resultB![p]?.inject).toBe(ClassB);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
