/**
 * 属性测试 2：Meta Decorator 元数据存储与唯一性
 *
 * Feature: stage3-decorator-migration, Property 2: Meta Decorator 元数据存储与唯一性
 *
 * 对于任意类和任意方法名，将 createMetaDecorator 创建的装饰器（如 @PostConstruct 或 @PreDestroy）
 * 应用于该方法后实例化该类，通过 getOwnMetadata(metaKey, Ctor) 获取的元数据应为
 * { key: 方法名, value: 装饰器参数 } 格式。若在同一个类上对两个不同方法使用相同的
 * Meta Decorator，则应在类定义时抛出错误。
 *
 * 测试策略：
 * - 使用 decorate() 辅助函数动态应用 @PostConstruct / @PreDestroy 装饰器
 * - 使用 fast-check 生成随机方法名和装饰器参数
 * - 验证元数据格式为 { key: 方法名, value: 装饰器参数 }
 * - 验证同一个类上重复使用相同 Meta Decorator 时抛出错误
 *
 * Validates: Requirements 2.3, 2.4, 2.5, 4.1, 4.2, 4.3
 */

import fc from 'fast-check';
import { PostConstruct, PreDestroy, decorate } from '@/index';
import { getOwnMetadata } from '@/cachemap';
import { KEYS, ERRORS } from '@/constants';

// Feature: stage3-decorator-migration, Property 2: Meta Decorator 元数据存储与唯一性

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

/**
 * 生成 PostConstruct 的可选过滤参数（可以是 undefined 或 true）
 */
const arbPostConstructParam = fc.oneof(
  fc.constant(undefined),
  fc.constant(true),
);

// ==================== @PostConstruct 元数据存储正确性 ====================

test('Property 2: 对于任意方法名，@PostConstruct 应将元数据以 { key, value } 格式存储', () => {
  fc.assert(
    fc.property(arbMethodName, arbPostConstructParam, (methodName, param) => {
      // 动态创建类并添加方法
      class TestClass {
        [methodName]() {}
      }

      // 使用 decorate 应用 @PostConstruct 装饰器
      if (param === undefined) {
        decorate(PostConstruct(), TestClass, methodName);
      } else {
        decorate(PostConstruct(param), TestClass, methodName);
      }

      // 验证元数据格式
      const metadata = getOwnMetadata(KEYS.POST_CONSTRUCT, TestClass);
      expect(metadata).toBeDefined();
      expect(metadata).toEqual({ key: methodName, value: param });
    }),
    { numRuns: 100 },
  );
});

// ==================== @PreDestroy 元数据存储正确性 ====================

test('Property 2: 对于任意方法名，@PreDestroy 应将元数据以 { key, value } 格式存储', () => {
  fc.assert(
    fc.property(arbMethodName, (methodName) => {
      // 动态创建类并添加方法
      class TestClass {
        [methodName]() {}
      }

      // 使用 decorate 应用 @PreDestroy 装饰器
      decorate(PreDestroy(), TestClass, methodName);

      // 验证元数据格式（PreDestroy 无参数，value 应为 undefined）
      const metadata = getOwnMetadata(KEYS.PRE_DESTROY, TestClass);
      expect(metadata).toBeDefined();
      expect(metadata).toEqual({ key: methodName, value: undefined });
    }),
    { numRuns: 100 },
  );
});

// ==================== @PostConstruct 唯一性约束 ====================

test('Property 2: 同一个类上对两个不同方法使用 @PostConstruct 应抛出错误', () => {
  fc.assert(
    fc.property(arbTwoDistinctMethodNames, ([method1, method2]) => {
      // 动态创建类并添加两个方法
      class TestClass {
        [method1]() {}
        [method2]() {}
      }

      // 第一次应用不应抛出错误
      decorate(PostConstruct(), TestClass, method1);

      // 第二次应用相同的 Meta Decorator 应抛出错误
      expect(() => {
        decorate(PostConstruct(), TestClass, method2);
      }).toThrowError(ERRORS.POST_CONSTRUCT);
    }),
    { numRuns: 100 },
  );
});

// ==================== @PreDestroy 唯一性约束 ====================

test('Property 2: 同一个类上对两个不同方法使用 @PreDestroy 应抛出错误', () => {
  fc.assert(
    fc.property(arbTwoDistinctMethodNames, ([method1, method2]) => {
      // 动态创建类并添加两个方法
      class TestClass {
        [method1]() {}
        [method2]() {}
      }

      // 第一次应用不应抛出错误
      decorate(PreDestroy(), TestClass, method1);

      // 第二次应用相同的 Meta Decorator 应抛出错误
      expect(() => {
        decorate(PreDestroy(), TestClass, method2);
      }).toThrowError(ERRORS.PRE_DESTROY);
    }),
    { numRuns: 100 },
  );
});

// ==================== 使用真实装饰器语法验证元数据存储 ====================

test('Property 2: 使用装饰器语法，@PostConstruct 元数据应在实例化后正确存储', () => {
  fc.assert(
    fc.property(arbPostConstructParam, (param) => {
      // 使用真实装饰器语法（方法名固定为 init，因为装饰器语法是静态的）
      class TestClass {
        @PostConstruct(param)
        init() {}
      }

      // 实例化触发 addInitializer 回调，将元数据写入 CacheMap
      new TestClass();

      const metadata = getOwnMetadata(KEYS.POST_CONSTRUCT, TestClass);
      expect(metadata).toBeDefined();
      expect(metadata).toEqual({ key: 'init', value: param });
    }),
    { numRuns: 100 },
  );
});

test('Property 2: 使用装饰器语法，@PreDestroy 元数据应在实例化后正确存储', () => {
  fc.assert(
    fc.property(fc.boolean(), (_flag) => {
      // 使用真实装饰器语法
      class TestClass {
        @PreDestroy()
        cleanup() {}
      }

      // 实例化触发 addInitializer 回调
      new TestClass();

      const metadata = getOwnMetadata(KEYS.PRE_DESTROY, TestClass);
      expect(metadata).toBeDefined();
      expect(metadata).toEqual({ key: 'cleanup', value: undefined });
    }),
    { numRuns: 100 },
  );
});

// ==================== 使用装饰器语法验证唯一性约束 ====================

test('Property 2: 使用装饰器语法，同一个类上重复使用 @PostConstruct 应在类定义时抛出错误', () => {
  fc.assert(
    fc.property(fc.boolean(), (_flag) => {
      // Stage 3 装饰器：重复检测在装饰器应用阶段（类定义时）执行
      expect(() => {
        class TestClass {
          @PostConstruct()
          init1() {}

          @PostConstruct()
          init2() {}
        }
        void TestClass;
      }).toThrowError(ERRORS.POST_CONSTRUCT);
    }),
    { numRuns: 100 },
  );
});

test('Property 2: 使用装饰器语法，同一个类上重复使用 @PreDestroy 应在类定义时抛出错误', () => {
  fc.assert(
    fc.property(fc.boolean(), (_flag) => {
      expect(() => {
        class TestClass {
          @PreDestroy()
          cleanup1() {}

          @PreDestroy()
          cleanup2() {}
        }
        void TestClass;
      }).toThrowError(ERRORS.PRE_DESTROY);
    }),
    { numRuns: 100 },
  );
});
