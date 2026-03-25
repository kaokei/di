/**
 * Bug 3 探索测试：createMetaDecorator 重复检测失效
 *
 * 验证通过 decorate() 辅助函数在同一类上应用多个相同方法装饰器时，
 * 应该抛出重复检测错误。
 *
 * 当前 createMetaDecorator 的重复检测依赖 context.metadata 作为 WeakMap 的键，
 * 但 decorate() 每次调用都创建新的 context 对象（包含新的 metadata: {}），
 * 导致 appliedClasses.has(classKey) 始终返回 false，重复检测失效。
 *
 * 预期：在未修复代码上测试失败（暴露 bug）
 *
 * Validates: Requirements 1.4
 */

import { PostConstruct, decorate } from '@/decorator';
import { getOwnMetadata } from '@/cachemap';
import { ERRORS, KEYS } from '@/constants';

describe('Bug 条件探索：createMetaDecorator 重复检测失效', () => {
  test('通过 decorate() 在同一类上应用两个 @PostConstruct 应抛出错误', () => {
    class MyClass {
      init1() {}
      init2() {}
    }

    // 第一次应用 @PostConstruct 到 init1 方法
    decorate(PostConstruct(), MyClass, 'init1');

    // 第二次应用 @PostConstruct 到 init2 方法
    // 同一类上不允许多个 @PostConstruct，应该抛出错误
    // 但由于 decorate() 每次创建新的 context.metadata 对象，
    // appliedClasses WeakMap 无法检测到重复，不会抛出错误
    expect(() => {
      decorate(PostConstruct(), MyClass, 'init2');
    }).toThrow(ERRORS.POST_CONSTRUCT);
  });
});


/**
 * Bug 3 保持性测试：正常装饰器应用行为保持不变
 *
 * 验证在修复前后，createMetaDecorator 的正常使用场景行为一致：
 * 1. 单个 @PostConstruct 通过 decorate() 正常工作（元数据正确写入）
 * 2. 不同类分别应用 @PostConstruct 不会互相干扰
 * 3. 子类和父类分别应用 @PostConstruct 不会冲突
 * 4. 通过 Stage 3 装饰器语法在同一类上使用两个 @PostConstruct 会抛出错误
 *
 * 预期：在未修复代码上通过（确认基线行为需要保持）
 *
 * Validates: Requirements 3.2, 3.4, 3.7
 */

describe('保持性测试：createMetaDecorator 正常装饰器应用行为', () => {
  test('单个 @PostConstruct 通过 decorate() 正常工作，元数据正确写入', () => {
    class MyService {
      init() {}
    }

    // 通过 decorate() 应用单个 @PostConstruct
    decorate(PostConstruct(), MyService, 'init');

    // 验证元数据正确写入到 CacheMap
    const meta = getOwnMetadata(KEYS.POST_CONSTRUCT, MyService);
    expect(meta).toBeDefined();
    expect(meta!.key).toBe('init');
  });

  test('不同类分别应用 @PostConstruct 不会互相干扰', () => {
    class ServiceA {
      initA() {}
    }

    class ServiceB {
      initB() {}
    }

    // 分别对两个不同的类应用 @PostConstruct
    decorate(PostConstruct(), ServiceA, 'initA');
    decorate(PostConstruct(), ServiceB, 'initB');

    // 验证各自的元数据独立且正确
    const metaA = getOwnMetadata(KEYS.POST_CONSTRUCT, ServiceA);
    expect(metaA).toBeDefined();
    expect(metaA!.key).toBe('initA');

    const metaB = getOwnMetadata(KEYS.POST_CONSTRUCT, ServiceB);
    expect(metaB).toBeDefined();
    expect(metaB!.key).toBe('initB');
  });

  test('子类和父类分别应用 @PostConstruct 不会冲突', () => {
    class Parent {
      parentInit() {}
    }

    class Child extends Parent {
      childInit() {}
    }

    // 父类和子类分别应用 @PostConstruct 到不同方法
    decorate(PostConstruct(), Parent, 'parentInit');
    decorate(PostConstruct(), Child, 'childInit');

    // 验证父类元数据正确
    const parentMeta = getOwnMetadata(KEYS.POST_CONSTRUCT, Parent);
    expect(parentMeta).toBeDefined();
    expect(parentMeta!.key).toBe('parentInit');

    // 验证子类元数据正确，不受父类影响
    const childMeta = getOwnMetadata(KEYS.POST_CONSTRUCT, Child);
    expect(childMeta).toBeDefined();
    expect(childMeta!.key).toBe('childInit');
  });

  test('通过 Stage 3 装饰器语法在同一类上使用两个 @PostConstruct，类定义时抛出错误', () => {
    // 重复检测在装饰器应用阶段通过 context.metadata 上的标记完成，
    // 使用 Object.hasOwn 仅检查当前类自身的标记，不受继承链影响
    expect(() => {
      class _DuplicateService {
        @PostConstruct()
        init1() {}

        @PostConstruct()
        init2() {}
      }
    }).toThrow(ERRORS.POST_CONSTRUCT);
  });
});
