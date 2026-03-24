/**
 * 常量模块与 Binding 类型安全测试
 *
 * 覆盖范围：
 * - BindingType 和 StatusType 联合类型是否正确约束 type 和 status 字段
 * - UNINITIALIZED Symbol 具有描述字符串
 * - Binding 实例的 type 默认值为 BINDING.Invalid，status 默认值为 STATUS.DEFAULT
 *
 * 需求：1.1、1.2、1.3、1.4、18.1、18.2
 */

import fc from 'fast-check';
import { Container, Token } from '@/index';
import { Binding } from '@/binding';
import { BINDING, STATUS, UNINITIALIZED } from '@/constants';
import type { BindingType, StatusType } from '@/constants';

// ==================== UNINITIALIZED 哨兵值（需求 18.1、18.2） ====================

describe('UNINITIALIZED 哨兵值', () => {
  test('UNINITIALIZED 是一个 Symbol', () => {
    expect(typeof UNINITIALIZED).toBe('symbol');
  });

  test('UNINITIALIZED Symbol 具有描述字符串 "UNINITIALIZED"', () => {
    expect(UNINITIALIZED.description).toBe('UNINITIALIZED');
  });

  test('UNINITIALIZED 与普通 Symbol() 不相等', () => {
    expect(UNINITIALIZED).not.toBe(Symbol());
    expect(UNINITIALIZED).not.toBe(Symbol('UNINITIALIZED'));
  });
});

// ==================== BindingType 和 StatusType 联合类型（需求 1.4） ====================

describe('BindingType 和 StatusType 联合类型', () => {
  test('BINDING 对象包含所有预期的绑定类型值', () => {
    expect(BINDING.Invalid).toBe('Invalid');
    expect(BINDING.Instance).toBe('Instance');
    expect(BINDING.ConstantValue).toBe('ConstantValue');
    expect(BINDING.DynamicValue).toBe('DynamicValue');
  });

  test('STATUS 对象包含所有预期的状态值', () => {
    expect(STATUS.DEFAULT).toBe('default');
    expect(STATUS.INITING).toBe('initing');
    expect(STATUS.ACTIVATED).toBe('activated');
  });

  test('BindingType 联合类型可以赋值为 BINDING 中的任意值', () => {
    // 编译期类型检查：以下赋值应通过 TypeScript 编译
    const t1: BindingType = BINDING.Invalid;
    const t2: BindingType = BINDING.Instance;
    const t3: BindingType = BINDING.ConstantValue;
    const t4: BindingType = BINDING.DynamicValue;
    expect([t1, t2, t3, t4]).toEqual([
      'Invalid',
      'Instance',
      'ConstantValue',
      'DynamicValue',
    ]);
  });

  test('StatusType 联合类型可以赋值为 STATUS 中的任意值', () => {
    // 编译期类型检查：以下赋值应通过 TypeScript 编译
    const s1: StatusType = STATUS.DEFAULT;
    const s2: StatusType = STATUS.INITING;
    const s3: StatusType = STATUS.ACTIVATED;
    expect([s1, s2, s3]).toEqual(['default', 'initing', 'activated']);
  });
});

// ==================== Binding 实例默认值（需求 1.1、1.2） ====================

describe('Binding 实例默认值', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  afterEach(() => {
    container.destroy();
  });

  test('新建 Binding 的 type 默认值为 BINDING.Invalid', () => {
    const token = new Token<string>('test');
    const binding = new Binding(token, container);
    expect(binding.type).toBe(BINDING.Invalid);
  });

  test('新建 Binding 的 status 默认值为 STATUS.DEFAULT', () => {
    const token = new Token<string>('test');
    const binding = new Binding(token, container);
    expect(binding.status).toBe(STATUS.DEFAULT);
  });

  test('Binding.type 在调用 to() 后变为 BINDING.Instance', () => {
    class MyService {}
    const binding = new Binding(MyService, container);
    binding.to(MyService);
    expect(binding.type).toBe(BINDING.Instance);
  });

  test('Binding.type 在调用 toConstantValue() 后变为 BINDING.ConstantValue', () => {
    const token = new Token<string>('test');
    const binding = new Binding(token, container);
    binding.toConstantValue('value');
    expect(binding.type).toBe(BINDING.ConstantValue);
  });

  test('Binding.type 在调用 toDynamicValue() 后变为 BINDING.DynamicValue', () => {
    const token = new Token<string>('test');
    const binding = new Binding(token, container);
    binding.toDynamicValue(() => 'dynamic');
    expect(binding.type).toBe(BINDING.DynamicValue);
  });

  test('Binding.postConstructResult 初始值为 UNINITIALIZED', () => {
    const token = new Token<string>('test');
    const binding = new Binding(token, container);
    expect(binding.postConstructResult).toBe(UNINITIALIZED);
  });
});


// ==================== 属性测试（fast-check） ====================

// Feature: code-quality-optimization, Property 1: Binding 可选属性初始值为 undefined
describe('属性 1：Binding 可选属性初始值为 undefined', () => {
  test('对于任意 token 名称，新建 Binding 的 classValue、constantValue、dynamicValue、cache 初始值均为 undefined', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (name) => {
        const container = new Container();
        try {
          const token = new Token(name);
          const binding = new Binding(token, container);

          // 验证需求 2.1：可选属性初始值为 undefined
          expect(binding.classValue).toBeUndefined();
          expect(binding.constantValue).toBeUndefined();
          expect(binding.dynamicValue).toBeUndefined();
          expect(binding.cache).toBeUndefined();
        } finally {
          container.destroy();
        }
      }),
      { numRuns: 100 },
    );
  });
});


// Feature: code-quality-optimization, Property 2: preDestroy 后属性为 undefined
describe('属性 2：preDestroy 后属性为 undefined', () => {
  test('对于任意常量值绑定，preDestroy 后 constantValue、cache 严格等于 undefined（非 null）', () => {
    fc.assert(
      fc.property(fc.string(), (value) => {
        const container = new Container();
        try {
          const token = new Token<string>('prop2-cv');
          container.bind(token).toConstantValue(value);
          container.get(token);
          const binding = container._bindings.get(token) as Binding;

          binding.preDestroy();

          // 验证需求 2.3：preDestroy 后属性为 undefined 而非 null
          expect(binding.constantValue).toBeUndefined();
          expect(binding.constantValue).not.toBeNull();
          expect(binding.cache).toBeUndefined();
          expect(binding.cache).not.toBeNull();
          expect(binding.classValue).toBeUndefined();
          expect(binding.dynamicValue).toBeUndefined();
        } finally {
          container.destroy();
        }
      }),
      { numRuns: 100 },
    );
  });

  test('对于任意动态值绑定，preDestroy 后 dynamicValue、cache 严格等于 undefined（非 null）', () => {
    fc.assert(
      fc.property(fc.string(), (value) => {
        const container = new Container();
        try {
          const token = new Token<string>('prop2-dv');
          container.bind(token).toDynamicValue(() => value);
          container.get(token);
          const binding = container._bindings.get(token) as Binding;

          binding.preDestroy();

          expect(binding.dynamicValue).toBeUndefined();
          expect(binding.dynamicValue).not.toBeNull();
          expect(binding.cache).toBeUndefined();
          expect(binding.cache).not.toBeNull();
          expect(binding.classValue).toBeUndefined();
          expect(binding.constantValue).toBeUndefined();
        } finally {
          container.destroy();
        }
      }),
      { numRuns: 100 },
    );
  });

  test('对于 Instance 类型绑定，preDestroy 后 classValue、cache 严格等于 undefined（非 null）', () => {
    const container = new Container();
    try {
      class TestService {}
      container.bind(TestService).toSelf();
      container.get(TestService);
      const binding = container._bindings.get(TestService) as Binding;

      binding.preDestroy();

      expect(binding.classValue).toBeUndefined();
      expect(binding.classValue).not.toBeNull();
      expect(binding.cache).toBeUndefined();
      expect(binding.cache).not.toBeNull();
      expect(binding.constantValue).toBeUndefined();
      expect(binding.dynamicValue).toBeUndefined();
    } finally {
      container.destroy();
    }
  });
});

// ==================== Binding 属性空安全（需求 2.1、2.2、2.3） ====================

describe('Binding 属性空安全', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  afterEach(() => {
    container.destroy();
  });

  test('新建 Binding 的 classValue 初始值为 undefined', () => {
    const token = new Token<string>('test');
    const binding = new Binding(token, container);
    expect(binding.classValue).toBeUndefined();
  });

  test('新建 Binding 的 constantValue 初始值为 undefined', () => {
    const token = new Token<string>('test');
    const binding = new Binding(token, container);
    expect(binding.constantValue).toBeUndefined();
  });

  test('新建 Binding 的 dynamicValue 初始值为 undefined', () => {
    const token = new Token<string>('test');
    const binding = new Binding(token, container);
    expect(binding.dynamicValue).toBeUndefined();
  });

  test('新建 Binding 的 cache 初始值为 undefined', () => {
    const token = new Token<string>('test');
    const binding = new Binding(token, container);
    expect(binding.cache).toBeUndefined();
  });

  test('preDestroy 后 classValue 严格等于 undefined（非 null）', () => {
    class MyService {}
    container.bind(MyService).toSelf();
    container.get(MyService); // 触发实例化
    const binding = container._bindings.get(MyService) as Binding;
    binding.preDestroy();
    expect(binding.classValue).toBeUndefined();
    expect(binding.classValue).not.toBeNull();
  });

  test('preDestroy 后 constantValue 严格等于 undefined（非 null）', () => {
    const token = new Token<string>('cv');
    container.bind(token).toConstantValue('hello');
    container.get(token);
    const binding = container._bindings.get(token) as Binding;
    binding.preDestroy();
    expect(binding.constantValue).toBeUndefined();
    expect(binding.constantValue).not.toBeNull();
  });

  test('preDestroy 后 dynamicValue 严格等于 undefined（非 null）', () => {
    const token = new Token<string>('dv');
    container.bind(token).toDynamicValue(() => 'dynamic');
    container.get(token);
    const binding = container._bindings.get(token) as Binding;
    binding.preDestroy();
    expect(binding.dynamicValue).toBeUndefined();
    expect(binding.dynamicValue).not.toBeNull();
  });

  test('preDestroy 后 cache 严格等于 undefined（非 null）', () => {
    const token = new Token<string>('c');
    container.bind(token).toConstantValue('cached');
    container.get(token);
    const binding = container._bindings.get(token) as Binding;
    binding.preDestroy();
    expect(binding.cache).toBeUndefined();
    expect(binding.cache).not.toBeNull();
  });
});

// ==================== _getInjectProperties 返回具名对象（需求 15.1、15.2） ====================

describe('_getInjectProperties 返回具名对象', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  afterEach(() => {
    container.destroy();
  });

  test('_getInjectProperties 返回值包含 properties 和 bindings 属性', () => {
    class MyService {}
    const binding = new Binding(MyService, container);
    binding.to(MyService);
    const options = { parent: { token: MyService } } as any;
    const result = binding._getInjectProperties(options);
    // 返回值应为具名对象
    expect(result).toHaveProperty('properties');
    expect(result).toHaveProperty('bindings');
  });

  test('无注入属性时 properties 为空对象，bindings 为空数组', () => {
    class EmptyService {}
    const binding = new Binding(EmptyService, container);
    binding.to(EmptyService);
    const options = { parent: { token: EmptyService } } as any;
    const result = binding._getInjectProperties(options);
    expect(Object.keys(result.properties)).toHaveLength(0);
    expect(result.bindings).toHaveLength(0);
  });
});
