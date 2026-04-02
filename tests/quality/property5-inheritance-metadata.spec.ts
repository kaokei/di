/**
 * 属性测试 5：继承链元数据合并正确性
 *
 * Feature: stage3-decorator-migration, Property 5: 继承链元数据合并正确性
 *
 * 对于任意继承链（子类 extends 父类），当父类和子类都声明了属性注入元数据时，
 * 通过 getInjectedProps(ChildCtor) 获取的元数据应包含父类和子类的
 * 所有属性声明，且子类的同名属性声明应覆盖父类的声明。
 *
 * 测试策略：
 * - 使用 decorate() 辅助函数动态应用装饰器来测试不同的属性名组合
 * - 使用 fast-check 生成随机 Token 名称和属性名
 * - 验证父子类元数据合并行为
 * - 验证子类同名属性覆盖父类声明
 * - 验证三层继承链的逐层合并
 *
 * Validates: Requirements 10.2, 10.3
 */

import fc from 'fast-check';
import { Token, Inject, Self, Optional, decorate } from '@/index';
import { getInjectedProps } from '@/cachemap';
import { KEYS } from '@/constants';

// Feature: stage3-decorator-migration, Property 5: 继承链元数据合并正确性

/**
 * 生成随机的 Token 名称
 */
const arbTokenName = fc.string({ minLength: 1, maxLength: 30 });

/**
 * 生成合法的 JavaScript 属性名（避免与 Object.prototype 上的属性冲突）
 */
const arbPropName = fc
  .string({ minLength: 1, maxLength: 20 })
  .filter((s) => /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(s))
  .filter((s) => !['constructor', 'prototype', '__proto__', 'toString', 'valueOf', 'hasOwnProperty'].includes(s));

/**
 * 生成两个不同的属性名
 */
const arbTwoDistinctPropNames = fc
  .tuple(arbPropName, arbPropName)
  .filter(([a, b]) => a !== b);

/**
 * 生成三个不同的属性名
 */
const arbThreeDistinctPropNames = fc
  .tuple(arbPropName, arbPropName, arbPropName)
  .filter(([a, b, c]) => a !== b && b !== c && a !== c);

// ==================== 父子类不同属性的元数据合并 ====================

test('Property 5: 父类有属性 A，子类有属性 B，getInjectedProps(子类) 应包含 A 和 B', () => {
  fc.assert(
    fc.property(
      arbTwoDistinctPropNames,
      arbTokenName,
      arbTokenName,
      ([propA, propB], tokenNameA, tokenNameB) => {
        const tokenA = new Token(tokenNameA);
        const tokenB = new Token(tokenNameB);

        // 创建父类并声明属性 A
        class Parent {
          [propA]: any;
        }
        decorate(Inject(tokenA), Parent, propA);

        // 创建子类并声明属性 B
        class Child extends Parent {
          [propB]: any;
        }
        decorate(Inject(tokenB), Child, propB);

        // getInjectedProps 应合并父类和子类的元数据
        const childMeta = getInjectedProps(Child);
        expect(childMeta).toBeDefined();

        // 应包含父类的属性 A
        expect(childMeta![propA]).toBeDefined();
        expect(childMeta![propA][KEYS.INJECT]).toBe(tokenA);

        // 应包含子类的属性 B
        expect(childMeta![propB]).toBeDefined();
        expect(childMeta![propB][KEYS.INJECT]).toBe(tokenB);

        // 父类自身的元数据应只包含属性 A
        const parentMeta = getInjectedProps(Parent);
        expect(parentMeta).toBeDefined();
        expect(parentMeta![propA]).toBeDefined();
        expect(parentMeta![propB]).toBeUndefined();
      },
    ),
    { numRuns: 100 },
  );
});

// ==================== 子类同名属性覆盖父类声明 ====================

test('Property 5: 父类有属性 A（Token1），子类也有属性 A（Token2），getInjectedProps(子类) 中 A 应为 Token2', () => {
  fc.assert(
    fc.property(
      arbPropName,
      arbTokenName,
      arbTokenName,
      (propName, tokenName1, tokenName2) => {
        const token1 = new Token(tokenName1);
        const token2 = new Token(tokenName2);

        // 创建父类，声明属性 propName 使用 token1
        class Parent {
          [propName]: any;
        }
        decorate(Inject(token1), Parent, propName);

        // 创建子类，同名属性 propName 使用 token2（应覆盖父类）
        class Child extends Parent {
          [propName]: any;
        }
        decorate(Inject(token2), Child, propName);

        // getInjectedProps(子类) 中该属性应为子类的 token2
        const childMeta = getInjectedProps(Child);
        expect(childMeta).toBeDefined();
        expect(childMeta![propName]).toBeDefined();
        expect(childMeta![propName][KEYS.INJECT]).toBe(token2);

        // 父类自身的元数据应保持 token1 不变
        const parentMeta = getInjectedProps(Parent);
        expect(parentMeta).toBeDefined();
        expect(parentMeta![propName][KEYS.INJECT]).toBe(token1);
      },
    ),
    { numRuns: 100 },
  );
});


// ==================== 三层继承链的逐层合并 ====================

test('Property 5: 三层继承链（祖父类 → 父类 → 子类），getInjectedProps 应逐层合并所有属性', () => {
  fc.assert(
    fc.property(
      arbThreeDistinctPropNames,
      arbTokenName,
      arbTokenName,
      arbTokenName,
      ([propA, propB, propC], tokenNameA, tokenNameB, tokenNameC) => {
        const tokenA = new Token(tokenNameA);
        const tokenB = new Token(tokenNameB);
        const tokenC = new Token(tokenNameC);

        // 祖父类：声明属性 A
        class GrandParent {
          [propA]: any;
        }
        decorate(Inject(tokenA), GrandParent, propA);

        // 父类：声明属性 B
        class Parent extends GrandParent {
          [propB]: any;
        }
        decorate(Inject(tokenB), Parent, propB);

        // 子类：声明属性 C
        class Child extends Parent {
          [propC]: any;
        }
        decorate(Inject(tokenC), Child, propC);

        // getInjectedProps(子类) 应包含所有三层的属性
        const childMeta = getInjectedProps(Child);
        expect(childMeta).toBeDefined();
        expect(childMeta![propA]).toBeDefined();
        expect(childMeta![propA][KEYS.INJECT]).toBe(tokenA);
        expect(childMeta![propB]).toBeDefined();
        expect(childMeta![propB][KEYS.INJECT]).toBe(tokenB);
        expect(childMeta![propC]).toBeDefined();
        expect(childMeta![propC][KEYS.INJECT]).toBe(tokenC);

        // getInjectedProps(父类) 应包含祖父类和父类的属性
        const parentMeta = getInjectedProps(Parent);
        expect(parentMeta).toBeDefined();
        expect(parentMeta![propA]).toBeDefined();
        expect(parentMeta![propA][KEYS.INJECT]).toBe(tokenA);
        expect(parentMeta![propB]).toBeDefined();
        expect(parentMeta![propB][KEYS.INJECT]).toBe(tokenB);
        expect(parentMeta![propC]).toBeUndefined();

        // getInjectedProps(祖父类) 应只包含自己的属性
        const grandMeta = getInjectedProps(GrandParent);
        expect(grandMeta).toBeDefined();
        expect(grandMeta![propA]).toBeDefined();
        expect(grandMeta![propA][KEYS.INJECT]).toBe(tokenA);
        expect(grandMeta![propB]).toBeUndefined();
        expect(grandMeta![propC]).toBeUndefined();
      },
    ),
    { numRuns: 100 },
  );
});

// ==================== 三层继承链中的同名属性覆盖 ====================

test('Property 5: 三层继承链中，子类同名属性应覆盖祖父类和父类的声明', () => {
  fc.assert(
    fc.property(
      arbPropName,
      arbTokenName,
      arbTokenName,
      arbTokenName,
      (propName, tokenNameGP, tokenNameP, tokenNameC) => {
        const tokenGP = new Token(tokenNameGP);
        const tokenP = new Token(tokenNameP);
        const tokenC = new Token(tokenNameC);

        // 祖父类：声明属性 propName 使用 tokenGP
        class GrandParent {
          [propName]: any;
        }
        decorate(Inject(tokenGP), GrandParent, propName);

        // 父类：同名属性使用 tokenP（覆盖祖父类）
        class Parent extends GrandParent {
          [propName]: any;
        }
        decorate(Inject(tokenP), Parent, propName);

        // 子类：同名属性使用 tokenC（覆盖父类和祖父类）
        class Child extends Parent {
          [propName]: any;
        }
        decorate(Inject(tokenC), Child, propName);

        // 子类的 getInjectedProps 应返回子类自己的 token
        const childMeta = getInjectedProps(Child);
        expect(childMeta).toBeDefined();
        expect(childMeta![propName][KEYS.INJECT]).toBe(tokenC);

        // 父类的 getInjectedProps 应返回父类自己的 token
        const parentMeta = getInjectedProps(Parent);
        expect(parentMeta).toBeDefined();
        expect(parentMeta![propName][KEYS.INJECT]).toBe(tokenP);

        // 祖父类的 getInjectedProps 应返回祖父类自己的 token
        const grandMeta = getInjectedProps(GrandParent);
        expect(grandMeta).toBeDefined();
        expect(grandMeta![propName][KEYS.INJECT]).toBe(tokenGP);
      },
    ),
    { numRuns: 100 },
  );
});

// ==================== 子类覆盖时装饰器标志也应覆盖 ====================

test('Property 5: 子类覆盖父类同名属性时，装饰器标志（如 @Optional）也应被覆盖', () => {
  fc.assert(
    fc.property(
      arbPropName,
      arbTokenName,
      arbTokenName,
      (propName, tokenName1, tokenName2) => {
        const token1 = new Token(tokenName1);
        const token2 = new Token(tokenName2);

        // 父类：属性带 @Inject + @Optional
        class Parent {
          [propName]: any;
        }
        decorate([Inject(token1), Optional()], Parent, propName);

        // 子类：同名属性只带 @Inject（不带 @Optional）
        class Child extends Parent {
          [propName]: any;
        }
        decorate(Inject(token2), Child, propName);

        // 父类的元数据应包含 optional 标志
        const parentMeta = getInjectedProps(Parent);
        expect(parentMeta![propName][KEYS.INJECT]).toBe(token1);
        expect(parentMeta![propName][KEYS.OPTIONAL]).toBe(true);

        // 子类的 getInjectedProps 中，该属性应使用子类的声明（不带 optional）
        const childMeta = getInjectedProps(Child);
        expect(childMeta![propName][KEYS.INJECT]).toBe(token2);
        // 子类没有声明 @Optional，所以该标志不应存在
        expect(childMeta![propName][KEYS.OPTIONAL]).toBeUndefined();
      },
    ),
    { numRuns: 100 },
  );
});
