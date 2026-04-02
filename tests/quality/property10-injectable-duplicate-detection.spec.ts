/**
 * 属性测试 10：方法装饰器重复检测
 *
 * Feature: 07-decorator-refactor-injectable, Property 3: 方法装饰器重复检测
 *
 * 对于任意类，当同一个类上应用两个 @PostConstruct 装饰器时，系统应抛出包含
 * ERRORS.POST_CONSTRUCT 的异常；当同一个类上应用两个 @PreDestroy 装饰器时，
 * 系统应抛出包含 ERRORS.PRE_DESTROY 的异常。无论是通过装饰器语法还是 decorate()
 * 函数应用，重复检测行为应一致。
 *
 * 测试策略：
 * - 使用 decorate() 辅助函数动态应用两个 @PostConstruct 或 @PreDestroy 装饰器
 * - 使用 fast-check 生成随机方法名
 * - 验证第二次应用相同装饰器时抛出对应错误
 * - 使用真实装饰器语法验证重复检测在类定义时触发
 * - 验证 @PostConstruct 和 @PreDestroy 混合使用不会触发重复检测
 *
 * Validates: Requirements 2.3, 2.4, 6.2
 */

import fc from 'fast-check';
import { PostConstruct, PreDestroy, decorate } from '@/index';
import { ERRORS } from '@/constants';

// Feature: 07-decorator-refactor-injectable, Property 3: 方法装饰器重复检测

/**
 * 生成合法的 JavaScript 方法名（避免与 Object.prototype 上的属性冲突）
 */
const arbMethodName = fc
  .string({ minLength: 1, maxLength: 20 })
  .filter((s) => /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(s))
  .filter((s) => !['constructor', 'prototype', '__proto__', 'toString', 'valueOf', 'hasOwnProperty'].includes(s));

/**
 * 生成两个不同的方法名
 */
const arbTwoDistinctMethodNames = fc
  .tuple(arbMethodName, arbMethodName)
  .filter(([a, b]) => a !== b);

// ==================== decorate() 重复 @PostConstruct 检测 ====================

test('Property 10.1: 通过 decorate() 对同一类应用两个 @PostConstruct 应抛出错误', () => {
  fc.assert(
    fc.property(arbTwoDistinctMethodNames, ([method1, method2]) => {
      class TestService {
        [method1]() {}
        [method2]() {}
      }

      // 第一次应用不应抛出错误
      decorate(PostConstruct(), TestService, method1);

      // 第二次应用相同的 Meta Decorator 应抛出错误
      expect(() => {
        decorate(PostConstruct(), TestService, method2);
      }).toThrowError(ERRORS.POST_CONSTRUCT);
    }),
    { numRuns: 100 },
  );
});

// ==================== decorate() 重复 @PreDestroy 检测 ====================

test('Property 10.2: 通过 decorate() 对同一类应用两个 @PreDestroy 应抛出错误', () => {
  fc.assert(
    fc.property(arbTwoDistinctMethodNames, ([method1, method2]) => {
      class TestService {
        [method1]() {}
        [method2]() {}
      }

      // 第一次应用不应抛出错误
      decorate(PreDestroy(), TestService, method1);

      // 第二次应用相同的 Meta Decorator 应抛出错误
      expect(() => {
        decorate(PreDestroy(), TestService, method2);
      }).toThrowError(ERRORS.PRE_DESTROY);
    }),
    { numRuns: 100 },
  );
});

// ==================== 真实装饰器语法重复 @PostConstruct 检测 ====================

test('Property 10.3: 使用装饰器语法，同一个类上重复使用 @PostConstruct 应在类定义时抛出错误', () => {
  fc.assert(
    fc.property(fc.boolean(), (_flag) => {
      // Stage 3 装饰器：重复检测在装饰器应用阶段（类定义时）执行
      expect(() => {
        class TestService {
          @PostConstruct()
          init1() {}

          @PostConstruct()
          init2() {}
        }
        void TestService;
      }).toThrowError(ERRORS.POST_CONSTRUCT);
    }),
    { numRuns: 100 },
  );
});

// ==================== 真实装饰器语法重复 @PreDestroy 检测 ====================

test('Property 10.4: 使用装饰器语法，同一个类上重复使用 @PreDestroy 应在类定义时抛出错误', () => {
  fc.assert(
    fc.property(fc.boolean(), (_flag) => {
      expect(() => {
        class TestService {
          @PreDestroy()
          cleanup1() {}

          @PreDestroy()
          cleanup2() {}
        }
        void TestService;
      }).toThrowError(ERRORS.PRE_DESTROY);
    }),
    { numRuns: 100 },
  );
});

// ==================== @PostConstruct 和 @PreDestroy 混合使用不应冲突 ====================

test('Property 10.5: 通过 decorate() 同时应用 @PostConstruct 和 @PreDestroy 不应触发重复检测', () => {
  fc.assert(
    fc.property(arbTwoDistinctMethodNames, ([method1, method2]) => {
      class TestService {
        [method1]() {}
        [method2]() {}
      }

      // 应用 @PostConstruct 和 @PreDestroy 是不同的装饰器，不应冲突
      decorate(PostConstruct(), TestService, method1);
      decorate(PreDestroy(), TestService, method2);

      // 不抛出错误即为通过
    }),
    { numRuns: 100 },
  );
});
