/**
 * 常量模块与 Binding 类型安全测试
 *
 * 覆盖范围：
 * - BindingType 和 StatusType 联合类型是否正确约束 type 和 status 字段
 * - UNINITIALIZED Symbol 具有描述字符串
 * - Binding 实例的 type 默认值为 BINDING.INVALID，status 默认值为 STATUS.DEFAULT
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
    expect(BINDING.INVALID).toBe('Invalid');
    expect(BINDING.INSTANCE).toBe('Instance');
    expect(BINDING.CONSTANT).toBe('ConstantValue');
    expect(BINDING.DYNAMIC).toBe('DynamicValue');
  });

  test('STATUS 对象包含所有预期的状态值', () => {
    expect(STATUS.DEFAULT).toBe('default');
    expect(STATUS.INITING).toBe('initing');
    expect(STATUS.ACTIVATED).toBe('activated');
  });

  test('BindingType 联合类型可以赋值为 BINDING 中的任意值', () => {
    // 编译期类型检查：以下赋值应通过 TypeScript 编译
    const t1: BindingType = BINDING.INVALID;
    const t2: BindingType = BINDING.INSTANCE;
    const t3: BindingType = BINDING.CONSTANT;
    const t4: BindingType = BINDING.DYNAMIC;
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

  test('新建 Binding 的 type 默认值为 BINDING.INVALID', () => {
    const token = new Token<string>('test');
    const binding = new Binding(token, container);
    expect(binding.type).toBe(BINDING.INVALID);
  });

  test('新建 Binding 的 status 默认值为 STATUS.DEFAULT', () => {
    const token = new Token<string>('test');
    const binding = new Binding(token, container);
    expect(binding.status).toBe(STATUS.DEFAULT);
  });

  test('Binding.type 在调用 to() 后变为 BINDING.INSTANCE', () => {
    class MyService {}
    const binding = new Binding(MyService, container);
    binding.to(MyService);
    expect(binding.type).toBe(BINDING.INSTANCE);
  });

  test('Binding.type 在调用 toConstantValue() 后变为 BINDING.CONSTANT', () => {
    const token = new Token<string>('test');
    const binding = new Binding(token, container);
    binding.toConstantValue('value');
    expect(binding.type).toBe(BINDING.CONSTANT);
  });

  test('Binding.type 在调用 toDynamicValue() 后变为 BINDING.DYNAMIC', () => {
    const token = new Token<string>('test');
    const binding = new Binding(token, container);
    binding.toDynamicValue(() => 'dynamic');
    expect(binding.type).toBe(BINDING.DYNAMIC);
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

// ==================== PostConstruct 异步处理（需求 17.1、17.2） ====================

import { Inject, Injectable, PostConstruct } from '@/index';

describe('postConstructResult 类型包含 undefined（需求 17.2）', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  afterEach(() => {
    container.destroy();
  });

  test('没有 @PostConstruct 装饰器时，解析后 postConstructResult 应为 undefined', () => {
    // 当类没有使用 @PostConstruct 装饰器时，
    // _postConstruct 方法会执行 `this.postConstructResult = void 0`，
    // 因此 postConstructResult 应为 undefined
    class NoPostConstructService {}
    container.bind(NoPostConstructService).toSelf();
    container.get(NoPostConstructService);
    const binding = container._bindings.get(NoPostConstructService) as Binding;
    expect(binding.postConstructResult).toBeUndefined();
    expect(binding.postConstructResult).not.toBe(UNINITIALIZED);
  });

  test('有 @PostConstruct() 无参数时，postConstructResult 应为 _execute 的返回值', () => {
    // 当 @PostConstruct() 没有参数时，postConstructResult 为 _execute 的返回值
    // 如果方法返回 undefined（非 async），则 postConstructResult 为 undefined
    @Injectable
    class SyncPostConstructService {
      initialized = false;

      @PostConstruct()
      init() {
        this.initialized = true;
        // 同步方法隐式返回 undefined
      }
    }
    container.bind(SyncPostConstructService).toSelf();
    const instance = container.get(SyncPostConstructService);
    const binding = container._bindings.get(SyncPostConstructService) as Binding;
    expect(instance.initialized).toBe(true);
    // 同步 PostConstruct 方法返回 undefined
    expect(binding.postConstructResult).toBeUndefined();
  });

  test('有 @PostConstruct() 且方法为 async 时，postConstructResult 应为 Promise', () => {
    // 当 @PostConstruct() 的方法是 async 时，_execute 返回 Promise
    @Injectable
    class AsyncPostConstructService {
      initialized = false;

      @PostConstruct()
      async init() {
        this.initialized = true;
      }
    }
    container.bind(AsyncPostConstructService).toSelf();
    container.get(AsyncPostConstructService);
    const binding = container._bindings.get(AsyncPostConstructService) as Binding;
    // async 方法返回 Promise
    expect(binding.postConstructResult).toBeInstanceOf(Promise);
  });

  test('初始值应为 UNINITIALIZED（已有测试覆盖，此处确认一致性）', () => {
    const token = new Token<string>('init-check');
    const binding = new Binding(token, container);
    expect(binding.postConstructResult).toBe(UNINITIALIZED);
  });
});

describe('前置服务 PostConstruct 失败时错误传播（需求 17.1）', () => {
  test('当 @PostConstruct(true) 等待的前置服务 PostConstruct 返回 rejected Promise 时，错误应正确传播', async () => {
    // 构造场景：
    // - ServiceB 的 @PostConstruct() 返回一个 rejected Promise
    // - ServiceA 依赖 ServiceB，且 ServiceA 使用 @PostConstruct(true) 等待 ServiceB 初始化
    // 预期：ServiceA 的 postConstructResult 应为一个 rejected Promise，错误被正确传播

    const ERROR_MESSAGE = 'ServiceB 初始化失败';

    @Injectable
    class ServiceB {
      @PostConstruct()
      async init() {
        throw new Error(ERROR_MESSAGE);
      }
    }

    @Injectable
    class ServiceA {
      @Inject(ServiceB) b!: ServiceB;

      initCalled = false;

      @PostConstruct(true)
      init() {
        // 如果前置服务失败，这个方法不应该被执行
        this.initCalled = true;
      }
    }

    const container = new Container();
    container.bind(ServiceB).toSelf();
    container.bind(ServiceA).toSelf();

    const a = container.get(ServiceA);
    const bindingA = container._bindings.get(ServiceA) as Binding;

    // ServiceA 的 postConstructResult 应为 Promise（因为等待前置服务）
    expect(bindingA.postConstructResult).toBeInstanceOf(Promise);

    // 等待 Promise 完成，应该被拒绝（错误从 ServiceB 传播过来）
    await expect(bindingA.postConstructResult).rejects.toThrow();

    // ServiceA 的 init 方法不应该被调用（因为前置服务失败了）
    expect(a.initCalled).toBe(false);

    container.destroy();
  });

  test('当多个前置服务中有一个 PostConstruct 失败时，错误应传播到依赖方', async () => {
    // 构造场景：ServiceA 依赖 ServiceB 和 ServiceC
    // ServiceB 正常初始化，ServiceC 的 PostConstruct 失败
    // ServiceA 使用 @PostConstruct(true) 等待所有前置服务

    @Injectable
    class ServiceB {
      @PostConstruct()
      async init() {
        // 正常完成
      }
    }

    @Injectable
    class ServiceC {
      @PostConstruct()
      async init() {
        throw new Error('ServiceC 初始化失败');
      }
    }

    @Injectable
    class ServiceA {
      @Inject(ServiceB) b!: ServiceB;
      @Inject(ServiceC) c!: ServiceC;

      initCalled = false;

      @PostConstruct(true)
      init() {
        this.initCalled = true;
      }
    }

    const container = new Container();
    container.bind(ServiceB).toSelf();
    container.bind(ServiceC).toSelf();
    container.bind(ServiceA).toSelf();

    const a = container.get(ServiceA);
    const bindingA = container._bindings.get(ServiceA) as Binding;

    expect(bindingA.postConstructResult).toBeInstanceOf(Promise);
    await expect(bindingA.postConstructResult).rejects.toThrow();
    expect(a.initCalled).toBe(false);

    container.destroy();
  });
});
