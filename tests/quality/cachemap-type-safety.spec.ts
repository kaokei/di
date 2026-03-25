/**
 * CacheMap 类型安全测试
 *
 * 覆盖范围：
 * - defineMetadata 和 getMetadata/getOwnMetadata 的基本读写
 * - 父子类继承场景下 getMetadata 的合并行为
 * - 子类修改 INJECTED_PROPS 元数据后父类元数据不受影响（深拷贝验证）
 *
 * 需求：7.1、7.2、7.3、7.4
 */

import { defineMetadata, getMetadata, getOwnMetadata } from '@/cachemap';
import { KEYS } from '@/constants';
import { Inject, decorate } from '@/index';

// ==================== 基本读写（需求 7.1、7.2） ====================

describe('defineMetadata 和 getMetadata/getOwnMetadata 基本读写', () => {
  test('defineMetadata 写入后 getOwnMetadata 可以读取', () => {
    class Target {}
    const metadata = { propA: { inject: Target } };
    defineMetadata(KEYS.INJECTED_PROPS, metadata, Target);

    const result = getOwnMetadata(KEYS.INJECTED_PROPS, Target);
    expect(result).toEqual(metadata);
  });

  test('getOwnMetadata 对未设置元数据的类返回 undefined', () => {
    class Empty {}
    const result = getOwnMetadata(KEYS.INJECTED_PROPS, Empty);
    expect(result).toBeUndefined();
  });

  test('defineMetadata 可以覆盖已有的元数据', () => {
    class Target {}
    defineMetadata(KEYS.INJECTED_PROPS, { a: { inject: Target } }, Target);
    defineMetadata(KEYS.INJECTED_PROPS, { b: { inject: Target } }, Target);

    const result = getOwnMetadata(KEYS.INJECTED_PROPS, Target);
    expect(result).toEqual({ b: { inject: Target } });
  });

  test('不同 metadataKey 互不干扰', () => {
    class Target {}
    defineMetadata(KEYS.INJECTED_PROPS, { prop: {} }, Target);
    defineMetadata(KEYS.POST_CONSTRUCT, { key: 'init' }, Target);

    expect(getOwnMetadata(KEYS.INJECTED_PROPS, Target)).toEqual({ prop: {} });
    expect(getOwnMetadata(KEYS.POST_CONSTRUCT, Target)).toEqual({ key: 'init' });
  });

  test('不同类的元数据互不干扰', () => {
    class A {}
    class B {}
    defineMetadata(KEYS.INJECTED_PROPS, { fromA: {} }, A);
    defineMetadata(KEYS.INJECTED_PROPS, { fromB: {} }, B);

    expect(getOwnMetadata(KEYS.INJECTED_PROPS, A)).toEqual({ fromA: {} });
    expect(getOwnMetadata(KEYS.INJECTED_PROPS, B)).toEqual({ fromB: {} });
  });

  test('getMetadata 对无父类的类等同于 getOwnMetadata', () => {
    class Standalone {}
    defineMetadata(KEYS.INJECTED_PROPS, { x: { inject: Standalone } }, Standalone);

    const own = getOwnMetadata(KEYS.INJECTED_PROPS, Standalone);
    const full = getMetadata(KEYS.INJECTED_PROPS, Standalone);
    expect(full).toEqual(own);
  });
});

// ==================== 父子类继承合并（需求 7.3） ====================

describe('父子类继承场景下 getMetadata 的合并行为', () => {
  test('子类继承父类的 INJECTED_PROPS 元数据', () => {
    class Dep {}

    class Parent {
      dep!: Dep;
    }
    decorate(Inject(Dep), Parent, 'dep');

    // 子类自身没有元数据，但通过继承链可以获取父类的
    class Child extends Parent {}

    const childMeta = getMetadata(KEYS.INJECTED_PROPS, Child);
    expect(childMeta).toBeDefined();
    expect(childMeta).toHaveProperty('dep');
  });

  test('子类自身元数据与父类元数据合并，子类优先', () => {
    class DepA {}
    class DepB {}

    class Parent {
      a!: DepA;
    }
    decorate(Inject(DepA), Parent, 'a');

    class Child extends Parent {
      b!: DepB;
    }
    decorate(Inject(DepB), Child, 'b');

    const childMeta = getMetadata(KEYS.INJECTED_PROPS, Child);
    // 应同时包含父类的 a 和子类的 b
    expect(childMeta).toHaveProperty('a');
    expect(childMeta).toHaveProperty('b');
  });

  test('子类覆盖父类同名属性的元数据', () => {
    class DepA {}
    class DepB {}

    class Parent {
      shared!: DepA;
    }
    decorate(Inject(DepA), Parent, 'shared');

    class Child extends Parent {
      declare shared: DepB;
    }
    decorate(Inject(DepB), Child, 'shared');

    const childMeta = getMetadata(KEYS.INJECTED_PROPS, Child);
    // 子类的 shared 应覆盖父类的 shared
    expect(childMeta.shared.inject).toBe(DepB);

    // 父类的元数据不应被改变
    const parentMeta = getMetadata(KEYS.INJECTED_PROPS, Parent);
    expect(parentMeta.shared.inject).toBe(DepA);
  });

  test('getOwnMetadata 不返回父类的元数据', () => {
    class Dep {}

    class Parent {
      dep!: Dep;
    }
    decorate(Inject(Dep), Parent, 'dep');

    class Child extends Parent {}

    // getOwnMetadata 只返回子类自身的元数据
    const ownMeta = getOwnMetadata(KEYS.INJECTED_PROPS, Child);
    expect(ownMeta).toBeUndefined();

    // getMetadata 可以获取继承链上的元数据
    const fullMeta = getMetadata(KEYS.INJECTED_PROPS, Child);
    expect(fullMeta).toBeDefined();
    expect(fullMeta).toHaveProperty('dep');
  });

  test('多层继承链的元数据正确合并', () => {
    class DepA {}
    class DepB {}
    class DepC {}

    class GrandParent {
      a!: DepA;
    }
    decorate(Inject(DepA), GrandParent, 'a');

    class Parent extends GrandParent {
      b!: DepB;
    }
    decorate(Inject(DepB), Parent, 'b');

    class Child extends Parent {
      c!: DepC;
    }
    decorate(Inject(DepC), Child, 'c');

    const childMeta = getMetadata(KEYS.INJECTED_PROPS, Child);
    expect(childMeta).toHaveProperty('a');
    expect(childMeta).toHaveProperty('b');
    expect(childMeta).toHaveProperty('c');
  });

  test('父类无元数据、子类有元数据时正常工作', () => {
    class Dep {}

    class Parent {}

    class Child extends Parent {
      dep!: Dep;
    }
    decorate(Inject(Dep), Child, 'dep');

    const childMeta = getMetadata(KEYS.INJECTED_PROPS, Child);
    expect(childMeta).toHaveProperty('dep');
  });

  test('父子类都无元数据时 getMetadata 返回 undefined', () => {
    class Parent {}
    class Child extends Parent {}

    const result = getMetadata(KEYS.INJECTED_PROPS, Child);
    expect(result).toBeUndefined();
  });
});

// ==================== 深拷贝隔离验证（需求 7.4） ====================

describe('子类修改 INJECTED_PROPS 元数据后父类不受影响（深拷贝验证）', () => {
  test('修改 getMetadata 返回的子类元数据不影响父类元数据', () => {
    class DepA {}
    class DepB {}

    class Parent {
      a!: DepA;
    }
    decorate(Inject(DepA), Parent, 'a');

    class Child extends Parent {
      b!: DepB;
    }
    decorate(Inject(DepB), Child, 'b');

    // 获取子类的合并元数据
    const childMeta = getMetadata(KEYS.INJECTED_PROPS, Child);

    // 修改子类元数据中继承自父类的属性
    childMeta.a.inject = DepB; // 篡改父类属性的 inject 值

    // 父类的元数据应保持不变
    const parentMeta = getMetadata(KEYS.INJECTED_PROPS, Parent);
    expect(parentMeta.a.inject).toBe(DepA);
  });

  test('向 getMetadata 返回的子类元数据添加新属性不影响父类', () => {
    class Dep {}

    class Parent {
      dep!: Dep;
    }
    decorate(Inject(Dep), Parent, 'dep');

    class Child extends Parent {}

    // 获取子类的合并元数据并添加新属性
    const childMeta = getMetadata(KEYS.INJECTED_PROPS, Child);
    childMeta.newProp = { inject: Dep };

    // 父类的元数据不应包含新添加的属性
    const parentMeta = getMetadata(KEYS.INJECTED_PROPS, Parent);
    expect(parentMeta).not.toHaveProperty('newProp');
  });

  test('深层嵌套对象的修改也不影响父类（深拷贝验证）', () => {
    class Dep {}

    class Parent {
      dep!: Dep;
    }
    decorate(Inject(Dep), Parent, 'dep');

    class Child extends Parent {}

    // 获取子类的合并元数据
    const childMeta = getMetadata(KEYS.INJECTED_PROPS, Child);

    // 修改深层嵌套的属性值
    childMeta.dep.extraField = 'polluted';

    // 验证父类的元数据中 dep 属性没有被污染
    const parentMeta = getOwnMetadata(KEYS.INJECTED_PROPS, Parent);
    expect(parentMeta.dep).not.toHaveProperty('extraField');
  });
});

// ==================== 非 INJECTED_PROPS 元数据的父子类继承合并 ====================

describe('非 INJECTED_PROPS 元数据的父子类继承合并', () => {
  test('子类继承父类的 POST_CONSTRUCT 元数据（通过 decorate 设置）', () => {
    class Parent {
      init() {}
    }
    // 手动通过 defineMetadata 给父类设置 POST_CONSTRUCT 元数据
    defineMetadata(KEYS.POST_CONSTRUCT, { key: 'init' }, Parent);

    // 子类自身没有 POST_CONSTRUCT 元数据
    class Child extends Parent {}

    // getMetadata 应通过继承链获取父类的 POST_CONSTRUCT
    const childMeta = getMetadata(KEYS.POST_CONSTRUCT, Child);
    expect(childMeta).toBeDefined();
    expect(childMeta).toHaveProperty('key', 'init');
  });

  test('子类自身的 POST_CONSTRUCT 覆盖父类的', () => {
    class Parent {
      parentInit() {}
    }
    defineMetadata(KEYS.POST_CONSTRUCT, { key: 'parentInit' }, Parent);

    class Child extends Parent {
      childInit() {}
    }
    defineMetadata(KEYS.POST_CONSTRUCT, { key: 'childInit' }, Child);

    // 子类的元数据应覆盖父类的（展开运算符后者覆盖前者）
    const childMeta = getMetadata(KEYS.POST_CONSTRUCT, Child);
    expect(childMeta).toHaveProperty('key', 'childInit');

    // 父类的元数据不受影响
    const parentMeta = getOwnMetadata(KEYS.POST_CONSTRUCT, Parent);
    expect(parentMeta).toHaveProperty('key', 'parentInit');
  });

  test('子类继承父类的 PRE_DESTROY 元数据', () => {
    class Parent {
      cleanup() {}
    }
    defineMetadata(KEYS.PRE_DESTROY, { key: 'cleanup' }, Parent);

    class Child extends Parent {}

    const childMeta = getMetadata(KEYS.PRE_DESTROY, Child);
    expect(childMeta).toBeDefined();
    expect(childMeta).toHaveProperty('key', 'cleanup');
  });

  test('父类无元数据、子类有 POST_CONSTRUCT 时正常工作', () => {
    class Parent {}

    class Child extends Parent {
      init() {}
    }
    defineMetadata(KEYS.POST_CONSTRUCT, { key: 'init' }, Child);

    const childMeta = getMetadata(KEYS.POST_CONSTRUCT, Child);
    expect(childMeta).toHaveProperty('key', 'init');
  });
});
