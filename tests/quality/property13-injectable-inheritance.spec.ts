/**
 * 属性测试 13：继承链元数据正确性
 *
 * Feature: 07-decorator-refactor-injectable, Property 6: 继承链元数据正确性
 *
 * 对于任意继承链（子类 extends 父类），当父类和子类都使用了 @Injectable 并声明了
 * 属性注入和/或生命周期装饰器时：
 * - getInjectedProps(Child) 应包含父类和子类的所有属性声明，子类同名属性覆盖父类
 * - getPostConstruct(Child) 在子类有 @PostConstruct 时返回子类的，否则返回父类的
 * - getPreDestroy(Child) 在子类有 @PreDestroy 时返回子类的，否则返回父类的
 * - 父类的 CacheMap 数据不受子类 @Injectable 的影响
 *
 * 测试策略：
 * - 使用 BOTH 装饰器语法（@Injectable）和 decorate() 辅助函数
 * - 使用 fast-check 生成随机 Token 名称
 * - 验证父子类元数据合并行为
 * - 验证子类同名属性覆盖父类声明
 * - 验证 PostConstruct/PreDestroy 的继承和覆盖
 * - 验证父类 CacheMap 数据不受子类影响
 * - 验证三层继承链的逐层合并
 *
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */

import fc from 'fast-check';
import { Token, Inject, PostConstruct, PreDestroy, Injectable, decorate } from '@/index';
import { getInjectedProps, getPostConstruct, getPreDestroy } from '@/cachemap';
import { KEYS } from '@/constants';

// Feature: 07-decorator-refactor-injectable, Property 6: 继承链元数据正确性

/**
 * 生成随机的 Token 名称
 */
const arbTokenName = fc.string({ minLength: 1, maxLength: 30 });

// ==================== 测试 1：父子类不同属性的元数据合并（decorate） ====================

test('Property 13.1: 父类有 @Inject(tokenA) on propA，子类有 @Inject(tokenB) on propB，getInjectedProps(Child) 应包含两者', () => {
  fc.assert(
    fc.property(arbTokenName, arbTokenName, (tokenNameA, tokenNameB) => {
      const tokenA = new Token(tokenNameA);
      const tokenB = new Token(tokenNameB);

      // 使用 decorate() 创建父子类
      class Parent {
        propA: any;
      }
      decorate(Inject(tokenA), Parent, 'propA');

      class Child extends Parent {
        propB: any;
      }
      decorate(Inject(tokenB), Child, 'propB');

      // getInjectedProps(Child) 应包含 propA 和 propB
      const childMeta = getInjectedProps(Child);
      expect(childMeta).toBeDefined();
      expect(childMeta!['propA']).toBeDefined();
      expect(childMeta!['propA'][KEYS.INJECT]).toBe(tokenA);
      expect(childMeta!['propB']).toBeDefined();
      expect(childMeta!['propB'][KEYS.INJECT]).toBe(tokenB);

      // 父类自身的元数据应只包含 propA
      const parentMeta = getInjectedProps(Parent);
      expect(parentMeta).toBeDefined();
      expect(parentMeta!['propA']).toBeDefined();
      expect(parentMeta!['propB']).toBeUndefined();
    }),
    { numRuns: 100 },
  );
});

// ==================== 测试 2：子类同名属性覆盖父类（decorate） ====================

test('Property 13.2: 父类有 @Inject(token1) on propX，子类有 @Inject(token2) on propX，getInjectedProps(Child) 中 propX 应为 token2', () => {
  fc.assert(
    fc.property(arbTokenName, arbTokenName, (tokenName1, tokenName2) => {
      const token1 = new Token(tokenName1);
      const token2 = new Token(tokenName2);

      class Parent {
        propX: any;
      }
      decorate(Inject(token1), Parent, 'propX');

      class Child extends Parent {
        declare propX: any;
      }
      decorate(Inject(token2), Child, 'propX');

      // 子类的 getInjectedProps 中 propX 应为 token2（子类覆盖）
      const childMeta = getInjectedProps(Child);
      expect(childMeta).toBeDefined();
      expect(childMeta!['propX'][KEYS.INJECT]).toBe(token2);

      // 父类的 getInjectedProps 中 propX 应保持 token1 不变
      const parentMeta = getInjectedProps(Parent);
      expect(parentMeta).toBeDefined();
      expect(parentMeta!['propX'][KEYS.INJECT]).toBe(token1);
    }),
    { numRuns: 100 },
  );
});

// ==================== 测试 3：父类有 @PostConstruct，子类没有 → 继承父类的 ====================

test('Property 13.3: 父类有 @PostConstruct，子类没有，getPostConstruct(Child) 应返回父类的 PostConstruct', () => {
  fc.assert(
    fc.property(arbTokenName, (tokenName) => {
      const token = new Token(tokenName);

      // 父类：使用 @Injectable + @PostConstruct + @Inject
      @Injectable
      class Parent {
        @Inject(token) dep: any;

        @PostConstruct()
        parentInit() {}
      }

      // 子类：只使用 @Injectable，没有 @PostConstruct
      @Injectable
      class Child extends Parent {}

      // getPostConstruct(Child) 应返回父类的 PostConstruct
      const childPC = getPostConstruct(Child);
      expect(childPC).toBeDefined();
      expect(childPC!.key).toBe('parentInit');

      // 父类自身的 PostConstruct 也应正确
      const parentPC = getPostConstruct(Parent);
      expect(parentPC).toBeDefined();
      expect(parentPC!.key).toBe('parentInit');
    }),
    { numRuns: 100 },
  );
});

// ==================== 测试 4：父子类都有 @PostConstruct → 子类覆盖 ====================

test('Property 13.4: 父类有 @PostConstruct，子类也有 @PostConstruct，getPostConstruct(Child) 应返回子类的', () => {
  fc.assert(
    fc.property(arbTokenName, (tokenName) => {
      const token = new Token(tokenName);

      @Injectable
      class Parent {
        @Inject(token) dep: any;

        @PostConstruct()
        parentInit() {}
      }

      @Injectable
      class Child extends Parent {
        @PostConstruct()
        childInit() {}
      }

      // getPostConstruct(Child) 应返回子类的 PostConstruct
      const childPC = getPostConstruct(Child);
      expect(childPC).toBeDefined();
      expect(childPC!.key).toBe('childInit');

      // 父类自身的 PostConstruct 不受影响
      const parentPC = getPostConstruct(Parent);
      expect(parentPC).toBeDefined();
      expect(parentPC!.key).toBe('parentInit');
    }),
    { numRuns: 100 },
  );
});

// ==================== 测试 5：父类有 @PreDestroy，子类没有 → 继承父类的 ====================

test('Property 13.5: 父类有 @PreDestroy，子类没有，getPreDestroy(Child) 应返回父类的 PreDestroy', () => {
  fc.assert(
    fc.property(arbTokenName, (tokenName) => {
      const token = new Token(tokenName);

      @Injectable
      class Parent {
        @Inject(token) dep: any;

        @PreDestroy()
        parentCleanup() {}
      }

      @Injectable
      class Child extends Parent {}

      // getPreDestroy(Child) 应返回父类的 PreDestroy
      const childPD = getPreDestroy(Child);
      expect(childPD).toBeDefined();
      expect(childPD!.key).toBe('parentCleanup');

      // 父类自身的 PreDestroy 也应正确
      const parentPD = getPreDestroy(Parent);
      expect(parentPD).toBeDefined();
      expect(parentPD!.key).toBe('parentCleanup');
    }),
    { numRuns: 100 },
  );
});

// ==================== 测试 6：父子类都有 @PreDestroy → 子类覆盖 ====================

test('Property 13.6: 父类有 @PreDestroy，子类也有 @PreDestroy，getPreDestroy(Child) 应返回子类的', () => {
  fc.assert(
    fc.property(arbTokenName, (tokenName) => {
      const token = new Token(tokenName);

      @Injectable
      class Parent {
        @Inject(token) dep: any;

        @PreDestroy()
        parentCleanup() {}
      }

      @Injectable
      class Child extends Parent {
        @PreDestroy()
        childCleanup() {}
      }

      // getPreDestroy(Child) 应返回子类的 PreDestroy
      const childPD = getPreDestroy(Child);
      expect(childPD).toBeDefined();
      expect(childPD!.key).toBe('childCleanup');

      // 父类自身的 PreDestroy 不受影响
      const parentPD = getPreDestroy(Parent);
      expect(parentPD).toBeDefined();
      expect(parentPD!.key).toBe('parentCleanup');
    }),
    { numRuns: 100 },
  );
});

// ==================== 测试 7：父子类都有 @Injectable，父类 CacheMap 数据不受子类影响 ====================

test('Property 13.7: 父子类都有 @Injectable，父类的 CacheMap 数据不受子类 @Injectable 影响', () => {
  fc.assert(
    fc.property(arbTokenName, arbTokenName, (tokenNameP, tokenNameC) => {
      const tokenP = new Token(tokenNameP);
      const tokenC = new Token(tokenNameC);

      @Injectable
      class Parent {
        @Inject(tokenP) parentDep: any;

        @PostConstruct()
        parentInit() {}

        @PreDestroy()
        parentCleanup() {}
      }

      // 记录父类的元数据（在子类定义之前）
      const parentPCBefore = getPostConstruct(Parent);
      const parentPDBefore = getPreDestroy(Parent);

      @Injectable
      class Child extends Parent {
        @Inject(tokenC) childDep: any;

        @PostConstruct()
        childInit() {}

        @PreDestroy()
        childCleanup() {}
      }

      // 子类定义后，父类的元数据应保持不变
      const parentPropsAfter = getInjectedProps(Parent);
      const parentPCAfter = getPostConstruct(Parent);
      const parentPDAfter = getPreDestroy(Parent);

      // 父类的 injectedProps 应只包含 parentDep
      expect(parentPropsAfter).toBeDefined();
      expect(parentPropsAfter!['parentDep']).toBeDefined();
      expect(parentPropsAfter!['parentDep'][KEYS.INJECT]).toBe(tokenP);
      expect(parentPropsAfter!['childDep']).toBeUndefined();

      // 父类的 PostConstruct 应保持不变
      expect(parentPCAfter).toEqual(parentPCBefore);
      expect(parentPCAfter!.key).toBe('parentInit');

      // 父类的 PreDestroy 应保持不变
      expect(parentPDAfter).toEqual(parentPDBefore);
      expect(parentPDAfter!.key).toBe('parentCleanup');

      // 子类的 getInjectedProps 应包含两者
      const childProps = getInjectedProps(Child);
      expect(childProps).toBeDefined();
      expect(childProps!['parentDep']).toBeDefined();
      expect(childProps!['childDep']).toBeDefined();
    }),
    { numRuns: 100 },
  );
});

// ==================== 测试 8：三层继承链（@Injectable 装饰器语法）====================

test('Property 13.8: 三层继承链 Grandparent → Parent → Child，getInjectedProps/getPostConstruct/getPreDestroy 应逐层合并', () => {
  fc.assert(
    fc.property(arbTokenName, arbTokenName, arbTokenName, (tokenNameGP, tokenNameP, tokenNameC) => {
      const tokenGP = new Token(tokenNameGP);
      const tokenP = new Token(tokenNameP);
      const tokenC = new Token(tokenNameC);

      // 祖父类：@Injectable + @Inject + @PostConstruct + @PreDestroy
      @Injectable
      class GrandParent {
        @Inject(tokenGP) gpDep: any;

        @PostConstruct()
        gpInit() {}

        @PreDestroy()
        gpCleanup() {}
      }

      // 父类：新增属性，覆盖 PostConstruct，不覆盖 PreDestroy
      @Injectable
      class Parent extends GrandParent {
        @Inject(tokenP) pDep: any;

        @PostConstruct()
        pInit() {}
      }

      // 子类：新增属性，覆盖 PreDestroy，不覆盖 PostConstruct
      @Injectable
      class Child extends Parent {
        @Inject(tokenC) cDep: any;

        @PreDestroy()
        cCleanup() {}
      }

      // === 验证 Child ===
      const childProps = getInjectedProps(Child);
      expect(childProps).toBeDefined();
      expect(childProps!['gpDep'][KEYS.INJECT]).toBe(tokenGP);
      expect(childProps!['pDep'][KEYS.INJECT]).toBe(tokenP);
      expect(childProps!['cDep'][KEYS.INJECT]).toBe(tokenC);

      // Child 的 PostConstruct 应为 Parent 的（Child 没有定义自己的，通过原型链继承）
      const childPC = getPostConstruct(Child);
      expect(childPC).toBeDefined();
      expect(childPC!.key).toBe('pInit');

      // Child 的 PreDestroy 应为 Child 自己的
      const childPD = getPreDestroy(Child);
      expect(childPD).toBeDefined();
      expect(childPD!.key).toBe('cCleanup');

      // === 验证 Parent ===
      const parentProps = getInjectedProps(Parent);
      expect(parentProps).toBeDefined();
      expect(parentProps!['gpDep'][KEYS.INJECT]).toBe(tokenGP);
      expect(parentProps!['pDep'][KEYS.INJECT]).toBe(tokenP);
      expect(parentProps!['cDep']).toBeUndefined();

      const parentPC = getPostConstruct(Parent);
      expect(parentPC!.key).toBe('pInit');

      // Parent 没有自己的 PreDestroy，应继承 GrandParent 的（通过原型链）
      const parentPD = getPreDestroy(Parent);
      expect(parentPD).toBeDefined();
      expect(parentPD!.key).toBe('gpCleanup');

      // === 验证 GrandParent ===
      const gpProps = getInjectedProps(GrandParent);
      expect(gpProps).toBeDefined();
      expect(gpProps!['gpDep'][KEYS.INJECT]).toBe(tokenGP);
      expect(gpProps!['pDep']).toBeUndefined();
      expect(gpProps!['cDep']).toBeUndefined();

      const gpPC = getPostConstruct(GrandParent);
      expect(gpPC!.key).toBe('gpInit');

      const gpPD = getPreDestroy(GrandParent);
      expect(gpPD!.key).toBe('gpCleanup');
    }),
    { numRuns: 100 },
  );
});
