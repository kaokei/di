/**
 * 属性测试 14：继承链中子类可独立定义生命周期方法
 *
 * Feature: 07-decorator-refactor-injectable, Property 7: 继承链中子类可独立定义生命周期方法
 *
 * 对于任意父子类继承关系，当父类已使用 @PostConstruct 或 @PreDestroy 时，
 * 子类应能独立定义自己的 @PostConstruct 或 @PreDestroy 而不触发重复检测错误。
 * 重复检测仅在同一个类内部生效。
 *
 * 核心原理：createMetaDecorator 中使用 hasOwn 检查 context.metadata 上的标记。
 * 由于子类的 context.metadata 是 Object.create(parentMetadata)，hasOwn 在子类
 * 的 metadata 上不会看到父类的 PostConstruct/PreDestroy 标记，因此不会触发重复检测。
 *
 * 测试策略：
 * - 使用装饰器语法（@Injectable）和 decorate() 两种方式验证
 * - 使用 fast-check 生成随机 Token 名称
 * - 验证父子类各自定义 @PostConstruct/@PreDestroy 不抛出错误
 * - 验证子类的生命周期方法正确存储（不与父类混淆）
 * - 对比测试：同一类内两个 @PostConstruct 仍应抛出错误
 *
 * Validates: Requirements 7.7
 */

import fc from 'fast-check';
import { Token, Inject, PostConstruct, PreDestroy, Injectable, decorate } from '@/index';
import { getMetadata } from '@/cachemap';
import { ERRORS, KEYS } from '@/constants';
import type { PostConstructParam } from '@/interfaces';

// Feature: 07-decorator-refactor-injectable, Property 7: 继承链中子类可独立定义生命周期方法

/**
 * 生成随机的 Token 名称
 */
const arbTokenName = fc.string({ minLength: 1, maxLength: 30 });


// ==================== 测试 1：父子类都有 @PostConstruct（装饰器语法 + @Injectable）不抛出错误 ====================

test('Property 14.1: 父类有 @PostConstruct，子类也有 @PostConstruct（装饰器语法 + @Injectable），不触发重复检测错误', () => {
  fc.assert(
    fc.property(arbTokenName, (tokenName) => {
      const token = new Token(tokenName);

      @Injectable()
      class Parent {
        @Inject(token) dep: any;

        @PostConstruct()
        parentInit() {}
      }

      // 子类定义不应抛出错误
      @Injectable()
      class Child extends Parent {
        @PostConstruct()
        childInit() {}
      }

      // 验证子类的 PostConstruct 正确存储
      const childPC = getMetadata(KEYS.POST_CONSTRUCT, Child) as { key: string; value?: PostConstructParam } | undefined;
      expect(childPC).toBeDefined();
      expect(childPC!.key).toBe('childInit');

      // 验证父类的 PostConstruct 不受影响
      const parentPC = getMetadata(KEYS.POST_CONSTRUCT, Parent) as { key: string; value?: PostConstructParam } | undefined;
      expect(parentPC).toBeDefined();
      expect(parentPC!.key).toBe('parentInit');
    }),
    { numRuns: 100 },
  );
});

// ==================== 测试 2：父子类都有 @PreDestroy（装饰器语法 + @Injectable）不抛出错误 ====================

test('Property 14.2: 父类有 @PreDestroy，子类也有 @PreDestroy（装饰器语法 + @Injectable），不触发重复检测错误', () => {
  fc.assert(
    fc.property(arbTokenName, (tokenName) => {
      const token = new Token(tokenName);

      @Injectable()
      class Parent {
        @Inject(token) dep: any;

        @PreDestroy()
        parentCleanup() {}
      }

      @Injectable()
      class Child extends Parent {
        @PreDestroy()
        childCleanup() {}
      }

      // 验证子类的 PreDestroy 正确存储
      const childPD = getMetadata(KEYS.PRE_DESTROY, Child) as { key: string } | undefined;
      expect(childPD).toBeDefined();
      expect(childPD!.key).toBe('childCleanup');

      // 验证父类的 PreDestroy 不受影响
      const parentPD = getMetadata(KEYS.PRE_DESTROY, Parent) as { key: string } | undefined;
      expect(parentPD).toBeDefined();
      expect(parentPD!.key).toBe('parentCleanup');
    }),
    { numRuns: 100 },
  );
});

// ==================== 测试 3：父子类都有 @PostConstruct（decorate）不抛出错误 ====================

test('Property 14.3: 父类有 @PostConstruct，子类也有 @PostConstruct（decorate），不触发重复检测错误', () => {
  fc.assert(
    fc.property(arbTokenName, (tokenName) => {
      const token = new Token(tokenName);

      class Parent {
        dep: any;
        parentInit() {}
      }
      decorate(Inject(token), Parent, 'dep');
      decorate(PostConstruct(), Parent, 'parentInit');

      class Child extends Parent {
        childInit() {}
      }
      // 子类应用 @PostConstruct 不应抛出错误
      decorate(PostConstruct(), Child, 'childInit');

      // 验证子类的 PostConstruct 正确存储
      const childPC = getMetadata(KEYS.POST_CONSTRUCT, Child) as { key: string; value?: PostConstructParam } | undefined;
      expect(childPC).toBeDefined();
      expect(childPC!.key).toBe('childInit');

      // 验证父类的 PostConstruct 不受影响
      const parentPC = getMetadata(KEYS.POST_CONSTRUCT, Parent) as { key: string; value?: PostConstructParam } | undefined;
      expect(parentPC).toBeDefined();
      expect(parentPC!.key).toBe('parentInit');
    }),
    { numRuns: 100 },
  );
});

// ==================== 测试 4：父子类都有 @PreDestroy（decorate）不抛出错误 ====================

test('Property 14.4: 父类有 @PreDestroy，子类也有 @PreDestroy（decorate），不触发重复检测错误', () => {
  fc.assert(
    fc.property(arbTokenName, (tokenName) => {
      const token = new Token(tokenName);

      class Parent {
        dep: any;
        parentCleanup() {}
      }
      decorate(Inject(token), Parent, 'dep');
      decorate(PreDestroy(), Parent, 'parentCleanup');

      class Child extends Parent {
        childCleanup() {}
      }
      // 子类应用 @PreDestroy 不应抛出错误
      decorate(PreDestroy(), Child, 'childCleanup');

      // 验证子类的 PreDestroy 正确存储
      const childPD = getMetadata(KEYS.PRE_DESTROY, Child) as { key: string } | undefined;
      expect(childPD).toBeDefined();
      expect(childPD!.key).toBe('childCleanup');

      // 验证父类的 PreDestroy 不受影响
      const parentPD = getMetadata(KEYS.PRE_DESTROY, Parent) as { key: string } | undefined;
      expect(parentPD).toBeDefined();
      expect(parentPD!.key).toBe('parentCleanup');
    }),
    { numRuns: 100 },
  );
});

// ==================== 测试 5：父子类同时有 @PostConstruct 和 @PreDestroy 不抛出错误 ====================

test('Property 14.5: 父类有 @PostConstruct 和 @PreDestroy，子类也都有，不触发重复检测错误', () => {
  fc.assert(
    fc.property(arbTokenName, (tokenName) => {
      const token = new Token(tokenName);

      @Injectable()
      class Parent {
        @Inject(token) dep: any;

        @PostConstruct()
        parentInit() {}

        @PreDestroy()
        parentCleanup() {}
      }

      @Injectable()
      class Child extends Parent {
        @PostConstruct()
        childInit() {}

        @PreDestroy()
        childCleanup() {}
      }

      // 验证子类的生命周期方法正确存储
      const childPC = getMetadata(KEYS.POST_CONSTRUCT, Child) as { key: string; value?: PostConstructParam } | undefined;
      expect(childPC).toBeDefined();
      expect(childPC!.key).toBe('childInit');

      const childPD = getMetadata(KEYS.PRE_DESTROY, Child) as { key: string } | undefined;
      expect(childPD).toBeDefined();
      expect(childPD!.key).toBe('childCleanup');

      // 验证父类的生命周期方法不受影响
      const parentPC = getMetadata(KEYS.POST_CONSTRUCT, Parent) as { key: string; value?: PostConstructParam } | undefined;
      expect(parentPC).toBeDefined();
      expect(parentPC!.key).toBe('parentInit');

      const parentPD = getMetadata(KEYS.PRE_DESTROY, Parent) as { key: string } | undefined;
      expect(parentPD).toBeDefined();
      expect(parentPD!.key).toBe('parentCleanup');
    }),
    { numRuns: 100 },
  );
});

// ==================== 测试 6：子类生命周期方法正确存储，不与父类混淆 ====================

test('Property 14.6: 子类的生命周期方法正确存储，不与父类混淆', () => {
  fc.assert(
    fc.property(arbTokenName, arbTokenName, (tokenNameP, tokenNameC) => {
      const tokenP = new Token(tokenNameP);
      const tokenC = new Token(tokenNameC);

      @Injectable()
      class Parent {
        @Inject(tokenP) parentDep: any;

        @PostConstruct()
        parentInit() {}

        @PreDestroy()
        parentCleanup() {}
      }

      @Injectable()
      class Child extends Parent {
        @Inject(tokenC) childDep: any;

        @PostConstruct()
        childInit() {}

        @PreDestroy()
        childCleanup() {}
      }

      // 子类的 PostConstruct 应为子类自己的，不是父类的
      const childPC = getMetadata(KEYS.POST_CONSTRUCT, Child) as { key: string; value?: PostConstructParam } | undefined;
      expect(childPC!.key).toBe('childInit');
      expect(childPC!.key).not.toBe('parentInit');

      // 子类的 PreDestroy 应为子类自己的，不是父类的
      const childPD = getMetadata(KEYS.PRE_DESTROY, Child) as { key: string } | undefined;
      expect(childPD!.key).toBe('childCleanup');
      expect(childPD!.key).not.toBe('parentCleanup');

      // 父类的 PostConstruct 和 PreDestroy 保持不变
      const parentPC = getMetadata(KEYS.POST_CONSTRUCT, Parent) as { key: string; value?: PostConstructParam } | undefined;
      expect(parentPC!.key).toBe('parentInit');

      const parentPD = getMetadata(KEYS.PRE_DESTROY, Parent) as { key: string } | undefined;
      expect(parentPD!.key).toBe('parentCleanup');
    }),
    { numRuns: 100 },
  );
});

// ==================== 测试 7：对比测试 —— 同一类内两个 @PostConstruct 仍应抛出错误 ====================

test('Property 14.7: 对比测试：同一类内两个 @PostConstruct 仍应抛出错误（确认重复检测在类内部生效）', () => {
  fc.assert(
    fc.property(fc.boolean(), (_flag) => {
      // 同一类内重复使用 @PostConstruct 应在类定义时抛出错误
      expect(() => {
        @Injectable()
        class BadService {
          @PostConstruct()
          init1() {}

          @PostConstruct()
          init2() {}
        }
        void BadService;
      }).toThrowError(ERRORS.POST_CONSTRUCT);

      // 同一类内重复使用 @PreDestroy 也应抛出错误
      expect(() => {
        @Injectable()
        class BadService2 {
          @PreDestroy()
          cleanup1() {}

          @PreDestroy()
          cleanup2() {}
        }
        void BadService2;
      }).toThrowError(ERRORS.PRE_DESTROY);
    }),
    { numRuns: 100 },
  );
});
