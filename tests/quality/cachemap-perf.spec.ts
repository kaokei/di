/**
 * getInjectedProps 缓存测试
 * 验证合并结果被缓存，defineMetadata 调用时缓存失效
 */
import { getInjectedProps, defineMetadata } from '@/cachemap';
import { KEYS } from '@/constants';

describe('getInjectedProps 缓存行为', () => {
  test('同一 target 多次调用返回内容相等的对象（缓存命中，返回浅拷贝防污染）', () => {
    class TestClass {}
    const meta = {
      [KEYS.INJECTED_PROPS]: { propA: { inject: 'TokenA' } },
    };
    defineMetadata(TestClass, meta);

    const result1 = getInjectedProps(TestClass);
    const result2 = getInjectedProps(TestClass);

    // 返回浅拷贝，内容相同但引用不同（防止调用方修改污染缓存）
    expect(result1).toEqual(result2);
    expect(result1).not.toBe(result2);
  });

  test('修改返回值不影响下次调用（缓存防污染）', () => {
    class TestClass3 {}
    defineMetadata(TestClass3, {
      [KEYS.INJECTED_PROPS]: { propX: { inject: 'TokenX' } },
    });

    const result1 = getInjectedProps(TestClass3)!;
    // 污染返回值
    result1['polluted'] = { inject: 'bad' };
    delete result1['propX'];

    // 再次获取，应不受污染影响
    const result2 = getInjectedProps(TestClass3);
    expect(result2).toHaveProperty('propX');
    expect(result2).not.toHaveProperty('polluted');
  });

  test('有父类时，多次调用返回内容相等的合并对象', () => {
    class Base {}
    defineMetadata(Base, {
      [KEYS.INJECTED_PROPS]: { baseP: { inject: 'BaseToken' } },
    });

    class Child extends Base {}
    defineMetadata(Child, {
      [KEYS.INJECTED_PROPS]: { childP: { inject: 'ChildToken' } },
    });

    const r1 = getInjectedProps(Child);
    const r2 = getInjectedProps(Child);

    expect(r1).toEqual(r2);
    expect(r1).toHaveProperty('baseP');
    expect(r1).toHaveProperty('childP');
  });

  test('defineMetadata 重新调用后，缓存应失效（返回新对象）', () => {
    class TestClass2 {}
    const meta1 = {
      [KEYS.INJECTED_PROPS]: { propA: { inject: 'TokenA' } },
    };
    defineMetadata(TestClass2, meta1);
    const result1 = getInjectedProps(TestClass2);

    const meta2 = {
      [KEYS.INJECTED_PROPS]: { propB: { inject: 'TokenB' } },
    };
    defineMetadata(TestClass2, meta2);
    const result2 = getInjectedProps(TestClass2);

    expect(result1).not.toBe(result2);
    expect(result2).toHaveProperty('propB');
    expect(result2).not.toHaveProperty('propA');
  });

  test('有父类时，合并结果包含父类属性', () => {
    class ParentClass {}
    defineMetadata(ParentClass, {
      [KEYS.INJECTED_PROPS]: { parentProp: { inject: 'ParentToken' } },
    });

    class ChildClass extends ParentClass {}
    defineMetadata(ChildClass, {
      [KEYS.INJECTED_PROPS]: { childProp: { inject: 'ChildToken' } },
    });

    const result = getInjectedProps(ChildClass);
    expect(result).toHaveProperty('parentProp');
    expect(result).toHaveProperty('childProp');
  });

  test('没有注入属性的类返回 undefined，不报错', () => {
    class EmptyClass {}
    const result = getInjectedProps(EmptyClass);
    expect(result).toBeUndefined();
  });

  test('无注入属性的类多次调用也不报错（缓存 undefined）', () => {
    class EmptyClass2 {}
    const result1 = getInjectedProps(EmptyClass2);
    const result2 = getInjectedProps(EmptyClass2);
    expect(result1).toBeUndefined();
    expect(result2).toBeUndefined();
  });
});
