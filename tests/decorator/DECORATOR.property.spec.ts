/**
 * 属性测试：tests/decorator/ 目录的元数据 round-trip 不变量
 *
 * 对应原始目录：tests/decorator/（createMetaDecorator-cachemap、lazy-inject-error-constant 等场景测试）
 * 测试目标：验证 decorate(PostConstruct(), Class, 'init') 后，
 *           getPostConstruct(Class).key 严格等于 'init'（元数据 round-trip 属性）
 *
 * 限制说明：由于 PostConstruct 装饰器需要类上存在对应方法，
 *           此处使用固定方法名 'init'，每次迭代动态创建新类以避免
 *           重复 decorate 同一类导致 DuplicatePostConstruct 错误。
 *
 * Validates: Requirements 9.2
 */

import fc from 'fast-check';
import { PostConstruct, decorate } from '@/decorator';
import { getPostConstruct } from '@/cachemap';

// ==================== 属性 22：decorate PostConstruct 元数据 round-trip ====================

test('Property 22: 对任意类，decorate(PostConstruct(), Class, "init") 后 getPostConstruct(Class).key 严格等于 "init"', () => {
  // Feature: fast-check-property-tests, Property 22: decorate PostConstruct 元数据 round-trip 属性
  // 由于方法名固定为 'init'，使用 fc.boolean() 作为占位符生成器驱动迭代
  fc.assert(
    fc.property(fc.boolean(), (_placeholder) => {
      // 每次迭代创建新的类，避免重复 decorate 同一类导致 DuplicatePostConstruct 错误
      const TestClass = class {
        init() {}
      };

      decorate(PostConstruct(), TestClass, 'init');

      const meta = getPostConstruct(TestClass);
      expect(meta).toBeDefined();
      expect(meta!.key).toBe('init');
    }),
    { numRuns: 100 },
  );
});
