/**
 * Bug 1 探索测试：deepCloneInjectedProps 不必要的深拷贝
 *
 * 验证 getMetadata 在合并父子类 INJECTED_PROPS 元数据时，
 * 内层属性值应为原始引用（不是深拷贝的副本）。
 *
 * 当前代码使用了 deepCloneInjectedProps 进行深拷贝，
 * 导致内层属性值不是原始引用，测试预期失败。
 *
 * Validates: Requirements 1.1, 1.2
 */

import { getMetadata, getOwnMetadata } from '@/cachemap';
import { KEYS } from '@/constants';
import { Inject, decorate } from '@/index';

describe('Bug 条件探索：deepCloneInjectedProps 不必要的深拷贝', () => {
  test('getMetadata 返回的内层属性值应为原始引用，而非深拷贝副本', () => {
    // 准备：定义依赖类和父类
    class Dep {}

    class Parent {
      dep!: Dep;
    }
    // 手动应用 @Inject(Dep) 装饰器到 Parent.dep
    decorate(Inject(Dep), Parent, 'dep');

    // 子类继承父类，自身不添加任何装饰器
    class Child extends Parent {}

    // 获取父类自身的元数据（原始引用）
    const parentOwnMeta = getOwnMetadata(KEYS.INJECTED_PROPS, Parent);
    expect(parentOwnMeta).toBeDefined();

    // 获取子类合并后的元数据（通过 getMetadata 触发继承合并）
    const childMergedMeta = getMetadata(KEYS.INJECTED_PROPS, Child);
    expect(childMergedMeta).toBeDefined();

    // 核心断言：子类合并结果中继承自父类的 'dep' 属性的内层对象
    // 应该与父类 getOwnMetadata 返回的内层对象是同一引用（===）
    // 如果 deepCloneInjectedProps 存在，内层对象会被拷贝，=== 返回 false
    // 如果移除 deepCloneInjectedProps，内层对象保持原始引用，=== 返回 true
    expect(childMergedMeta!['dep']).toBe(parentOwnMeta!['dep']);
  });

  test('父子类都有装饰器时，父类属性的内层对象应为原始引用', () => {
    // 准备：定义两个依赖类
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

    // 获取父类自身的元数据
    const parentOwnMeta = getOwnMetadata(KEYS.INJECTED_PROPS, Parent);
    expect(parentOwnMeta).toBeDefined();

    // 获取子类合并后的元数据
    const childMergedMeta = getMetadata(KEYS.INJECTED_PROPS, Child);
    expect(childMergedMeta).toBeDefined();

    // 核心断言：继承自父类的 'a' 属性内层对象应为同一引用
    expect(childMergedMeta!['a']).toBe(parentOwnMeta!['a']);

    // 子类自身的 'b' 属性也应为同一引用
    const childOwnMeta = getOwnMetadata(KEYS.INJECTED_PROPS, Child);
    expect(childMergedMeta!['b']).toBe(childOwnMeta!['b']);
  });
});

/**
 * Bug 1 保持性测试：继承场景下元数据合并行为保持不变
 *
 * 验证在修复前后，getMetadata 的合并行为保持一致：
 * 1. 父子类元数据正确合并（包含所有属性）
 * 2. 子类自身属性覆盖父类同名属性
 * 3. 返回值的外层修改不影响原始元数据
 * 4. 多层继承链的元数据正确合并
 *
 * 预期：在未修复代码上通过（确认基线行为）
 *
 * Validates: Requirements 3.1, 3.9
 */
describe('保持性测试：继承场景下元数据合并行为', () => {
  test('getMetadata 正确合并父子类元数据，包含父类和子类的所有属性', () => {
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

    const merged = getMetadata(KEYS.INJECTED_PROPS, Child);
    expect(merged).toBeDefined();
    // 合并结果应同时包含父类的 'a' 和子类的 'b'
    expect(merged!['a']).toBeDefined();
    expect(merged!['b']).toBeDefined();
    // 父类属性的 inject 值正确
    expect(merged!['a']['inject']).toBe(DepA);
    // 子类属性的 inject 值正确
    expect(merged!['b']['inject']).toBe(DepB);
  });

  test('子类自身属性覆盖父类同名属性', () => {
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

    const childMerged = getMetadata(KEYS.INJECTED_PROPS, Child);
    expect(childMerged).toBeDefined();
    // 子类的 shared 应覆盖父类的 shared，inject 值为 DepB
    expect(childMerged!['shared']['inject']).toBe(DepB);

    // 父类自身的元数据不受影响
    const parentMeta = getMetadata(KEYS.INJECTED_PROPS, Parent);
    expect(parentMeta).toBeDefined();
    expect(parentMeta!['shared']['inject']).toBe(DepA);
  });

  test('getMetadata 返回值的外层修改（添加/删除键）不影响原始元数据', () => {
    class Dep {}

    class Parent {
      dep!: Dep;
    }
    decorate(Inject(Dep), Parent, 'dep');

    class Child extends Parent {}

    // 第一次获取合并元数据
    const merged1 = getMetadata(KEYS.INJECTED_PROPS, Child);
    expect(merged1).toBeDefined();

    // 在返回值上添加新键
    merged1!['newKey'] = { inject: Dep };
    // 删除已有键
    delete merged1!['dep'];

    // 第二次获取合并元数据，应不受上次修改影响
    const merged2 = getMetadata(KEYS.INJECTED_PROPS, Child);
    expect(merged2).toBeDefined();
    expect(merged2!['dep']).toBeDefined();
    expect(merged2!['newKey']).toBeUndefined();
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

    const merged = getMetadata(KEYS.INJECTED_PROPS, Child);
    expect(merged).toBeDefined();
    // 三层继承链的所有属性都应存在
    expect(merged!['a']).toBeDefined();
    expect(merged!['b']).toBeDefined();
    expect(merged!['c']).toBeDefined();
    // 各属性的 inject 值正确
    expect(merged!['a']['inject']).toBe(DepA);
    expect(merged!['b']['inject']).toBe(DepB);
    expect(merged!['c']['inject']).toBe(DepC);
  });
});
