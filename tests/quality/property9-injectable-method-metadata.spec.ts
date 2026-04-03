/**
 * 属性测试 9：方法装饰器元数据存储正确性
 *
 * Feature: 07-decorator-refactor-injectable, Property 2: 方法装饰器元数据存储正确性
 *
 * 对于任意方法名和任意 PostConstructParam 参数值，将 @PostConstruct(value?) 通过
 * decorate() 动态应用于该方法后，通过 getPostConstruct(Ctor) 获取的元数据应为
 * { key: methodName, value: param }；将 @PreDestroy() 应用于方法后，通过
 * getPreDestroy(Ctor) 获取的元数据应为 { key: methodName, value: undefined }。
 *
 * 测试策略：
 * - 使用 decorate() 辅助函数动态应用 @PostConstruct / @PreDestroy 装饰器
 * - 使用 fast-check 生成随机方法名和 PostConstruct 参数
 * - 验证 getPostConstruct(Ctor) 返回 { key: methodName, value: param } 格式
 * - 验证 getPreDestroy(Ctor) 返回 { key: methodName, value: undefined } 格式
 * - 使用真实装饰器语法 + @Injectable 验证元数据存储
 *
 * Validates: Requirements 2.1, 2.2
 */

import fc from 'fast-check';
import { PostConstruct, PreDestroy, Injectable, decorate } from '@/index';
import { getPostConstruct, getPreDestroy } from '@/cachemap';

// Feature: 07-decorator-refactor-injectable, Property 2: 方法装饰器元数据存储正确性

/**
 * 生成合法的 JavaScript 方法名（避免与 Object.prototype 上的属性冲突）
 */
const arbMethodName = fc
  .string({ minLength: 1, maxLength: 20 })
  .filter((s) => /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(s))
  .filter((s) => !['constructor', 'prototype', '__proto__', 'toString', 'valueOf', 'hasOwnProperty'].includes(s));

/**
 * 生成 PostConstruct 的可选过滤参数（可以是 undefined 或 true）
 */
const arbPostConstructParam = fc.oneof(
  fc.constant(undefined),
  fc.constant(true),
);

// ==================== @PostConstruct 通过 decorate() 动态应用 ====================

test('Property 9.1: 使用 decorate() 应用 @PostConstruct，对于任意方法名和参数，元数据应以 { key, value } 格式存储', () => {
  fc.assert(
    fc.property(arbMethodName, arbPostConstructParam, (methodName, param) => {
      // 动态创建类并添加方法
      class TestService {
        [methodName]() {}
      }

      // 使用 decorate 应用 @PostConstruct 装饰器
      if (param === undefined) {
        decorate(PostConstruct(), TestService, methodName);
      } else {
        decorate(PostConstruct(param), TestService, methodName);
      }

      // 验证元数据格式
      const metadata = getPostConstruct(TestService);
      expect(metadata).toBeDefined();
      expect(metadata).toEqual({ key: methodName, value: param });
    }),
    { numRuns: 100 },
  );
});

// ==================== @PreDestroy 通过 decorate() 动态应用 ====================

test('Property 9.2: 使用 decorate() 应用 @PreDestroy，对于任意方法名，元数据应以 { key, value: undefined } 格式存储', () => {
  fc.assert(
    fc.property(arbMethodName, (methodName) => {
      // 动态创建类并添加方法
      class TestService {
        [methodName]() {}
      }

      // 使用 decorate 应用 @PreDestroy 装饰器
      decorate(PreDestroy(), TestService, methodName);

      // 验证元数据格式（PreDestroy 无参数，value 应为 undefined）
      const metadata = getPreDestroy(TestService);
      expect(metadata).toBeDefined();
      expect(metadata).toEqual({ key: methodName, value: undefined });
    }),
    { numRuns: 100 },
  );
});

// ==================== 使用真实装饰器语法 + @Injectable 验证 @PostConstruct ====================

test('Property 9.3: 使用装饰器语法 + @Injectable，@PostConstruct 元数据应正确存储', () => {
  fc.assert(
    fc.property(arbPostConstructParam, (param) => {
      @Injectable()
      class TestService {
        @PostConstruct(param)
        init() {}
      }

      const metadata = getPostConstruct(TestService);
      expect(metadata).toBeDefined();
      expect(metadata).toEqual({ key: 'init', value: param });
    }),
    { numRuns: 100 },
  );
});

// ==================== 使用真实装饰器语法 + @Injectable 验证 @PreDestroy ====================

test('Property 9.4: 使用装饰器语法 + @Injectable，@PreDestroy 元数据应正确存储', () => {
  fc.assert(
    fc.property(fc.boolean(), (_flag) => {
      @Injectable()
      class TestService {
        @PreDestroy()
        cleanup() {}
      }

      const metadata = getPreDestroy(TestService);
      expect(metadata).toBeDefined();
      expect(metadata).toEqual({ key: 'cleanup', value: undefined });
    }),
    { numRuns: 100 },
  );
});

// ==================== 同一类同时使用 @PostConstruct 和 @PreDestroy ====================

test('Property 9.5: 使用 decorate() 同时应用 @PostConstruct 和 @PreDestroy，两者元数据应独立正确存储', () => {
  fc.assert(
    fc.property(
      arbMethodName,
      arbMethodName.filter((s) => s !== 'init'),
      arbPostConstructParam,
      (initMethod, destroyMethod, param) => {
        // 确保两个方法名不同
        fc.pre(initMethod !== destroyMethod);

        class TestService {
          [initMethod]() {}
          [destroyMethod]() {}
        }

        // 分别应用 @PostConstruct 和 @PreDestroy
        if (param === undefined) {
          decorate(PostConstruct(), TestService, initMethod);
        } else {
          decorate(PostConstruct(param), TestService, initMethod);
        }
        decorate(PreDestroy(), TestService, destroyMethod);

        // 验证 @PostConstruct 元数据
        const pcMeta = getPostConstruct(TestService);
        expect(pcMeta).toBeDefined();
        expect(pcMeta).toEqual({ key: initMethod, value: param });

        // 验证 @PreDestroy 元数据
        const pdMeta = getPreDestroy(TestService);
        expect(pdMeta).toBeDefined();
        expect(pdMeta).toEqual({ key: destroyMethod, value: undefined });
      },
    ),
    { numRuns: 100 },
  );
});
