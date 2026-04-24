/**
 * defineMetadata / getOwnMetadata / getMetadata 公开导出测试
 *
 * 覆盖范围：
 * - 三个函数可从 @kaokei/di 导入
 * - getOwnMetadata：只查自身，不沿继承链
 * - getMetadata：沿继承链向上查找
 * - defineMetadata：替换元数据后旧值不再可读
 */

import {
  defineMetadata,
  getOwnMetadata,
  getMetadata,
} from '@/index';

// ==================== 导出可用性 ====================

describe('三个函数可从 @/index 导入', () => {
  test('defineMetadata 是函数', () => {
    const mod = { defineMetadata, getOwnMetadata, getMetadata };
    expect(typeof mod.defineMetadata).toBe('function');
    expect(typeof mod.getOwnMetadata).toBe('function');
    expect(typeof mod.getMetadata).toBe('function');
  });
});

// ==================== getOwnMetadata ====================

describe('getOwnMetadata：只查自身，不沿继承链', () => {
  test('读取自身存在的 key', () => {
    class A {}
    defineMetadata(A, { role: 'service' });
    expect(getOwnMetadata('role', A)).toBe('service');
  });

  test('子类未定义时返回 undefined，不查父类', () => {
    class Base {}
    class Child extends Base {}
    defineMetadata(Base, { role: 'base' });

    expect(getOwnMetadata('role', Child)).toBeUndefined();
  });

  test('key 不存在时返回 undefined', () => {
    class A {}
    defineMetadata(A, { other: 1 });
    expect(getOwnMetadata('missing', A)).toBeUndefined();
  });

  test('target 完全未注册时返回 undefined', () => {
    class Unregistered {}
    expect(getOwnMetadata('any', Unregistered)).toBeUndefined();
  });

  test('子类覆盖父类同名 key 时只返回子类值', () => {
    class Base {}
    class Child extends Base {}
    defineMetadata(Base, { role: 'base' });
    defineMetadata(Child, { role: 'child' });

    expect(getOwnMetadata('role', Child)).toBe('child');
    expect(getOwnMetadata('role', Base)).toBe('base');
  });
});

// ==================== getMetadata ====================

describe('getMetadata：沿继承链向上查找', () => {
  test('target 自身有 key 时直接返回', () => {
    class A {}
    defineMetadata(A, { version: 2 });
    expect(getMetadata('version', A)).toBe(2);
  });

  test('子类未定义、父类有时返回父类值', () => {
    class Base {}
    class Child extends Base {}
    defineMetadata(Base, { role: 'base' });

    expect(getMetadata('role', Child)).toBe('base');
  });

  test('子类覆盖父类同名 key 时返回子类值', () => {
    class Base {}
    class Child extends Base {}
    defineMetadata(Base, { role: 'base' });
    defineMetadata(Child, { role: 'child' });

    expect(getMetadata('role', Child)).toBe('child');
    expect(getMetadata('role', Base)).toBe('base');
  });

  test('多层继承链，从最远祖先继承', () => {
    class GrandParent {}
    class Parent extends GrandParent {}
    class Child extends Parent {}
    defineMetadata(GrandParent, { origin: 'grandparent' });

    expect(getMetadata('origin', Child)).toBe('grandparent');
    expect(getMetadata('origin', Parent)).toBe('grandparent');
  });

  test('整条链上均无该 key 时返回 undefined', () => {
    class Base {}
    class Child extends Base {}
    defineMetadata(Base, { other: 1 });

    expect(getMetadata('missing', Child)).toBeUndefined();
  });

  test('target 完全未注册时返回 undefined', () => {
    class Unregistered {}
    expect(getMetadata('any', Unregistered)).toBeUndefined();
  });
});

// ==================== defineMetadata 替换行为 ====================

describe('defineMetadata：替换后旧值不再可读', () => {
  test('覆盖元数据后 getOwnMetadata 返回新值', () => {
    class A {}
    defineMetadata(A, { v: 1 });
    defineMetadata(A, { v: 2 });
    expect(getOwnMetadata('v', A)).toBe(2);
  });

  test('覆盖元数据后旧 key 不再可读', () => {
    class A {}
    defineMetadata(A, { old: 'yes' });
    defineMetadata(A, { new: 'yes' });
    expect(getOwnMetadata('old', A)).toBeUndefined();
    expect(getOwnMetadata('new', A)).toBe('yes');
  });

  test('不同 target 的元数据互不影响', () => {
    class X {}
    class Y {}
    defineMetadata(X, { tag: 'x' });
    defineMetadata(Y, { tag: 'y' });
    expect(getOwnMetadata('tag', X)).toBe('x');
    expect(getOwnMetadata('tag', Y)).toBe('y');
  });
});
