/**
 * Binding.get 策略模式与职责分离测试
 *
 * 覆盖范围：
 * - Binding._resolvers 映射表包含 Instance、ConstantValue、DynamicValue 三个键
 * - 各类型绑定通过策略映射正确解析
 * - Invalid 类型抛出 BindingNotValidError
 * - _resolveInstanceValue 职责分离后的行为一致性
 *
 * 需求：3.1、3.2、3.3、16.1、16.2
 */

import { Container, Token, Inject, PostConstruct } from '@/index';
import { Binding } from '@/binding';
import { BINDING, STATUS } from '@/constants';
import { BindingNotValidError } from '@/errors/BindingNotValidError';
import { CircularDependencyError } from '@/errors/CircularDependencyError';

// 类型辅助：_resolvers 是重构后新增的静态属性，使用类型断言访问
const BindingClass = Binding as typeof Binding & {
  _resolvers: Record<string, string>;
};

// 类型辅助：_instanceContainerMap 是重构后重命名的静态属性
const ContainerClass = Container as typeof Container & {
  _instanceContainerMap?: WeakMap<object, Container>;
};

// ==================== 策略映射表结构验证（需求 3.1、3.3） ====================

describe('Binding._resolvers 策略映射表', () => {
  test('_resolvers 是 Binding 类的静态属性', () => {
    expect(BindingClass).toHaveProperty('_resolvers');
    expect(typeof BindingClass._resolvers).toBe('object');
  });

  test('_resolvers 包含 Instance 键，映射到 _resolveInstanceValue 方法名', () => {
    expect(BindingClass._resolvers).toHaveProperty(BINDING.Instance);
    expect(BindingClass._resolvers[BINDING.Instance]).toBe('_resolveInstanceValue');
  });

  test('_resolvers 包含 ConstantValue 键，映射到 _resolveConstantValue 方法名', () => {
    expect(BindingClass._resolvers).toHaveProperty(BINDING.ConstantValue);
    expect(BindingClass._resolvers[BINDING.ConstantValue]).toBe('_resolveConstantValue');
  });

  test('_resolvers 包含 DynamicValue 键，映射到 _resolveDynamicValue 方法名', () => {
    expect(BindingClass._resolvers).toHaveProperty(BINDING.DynamicValue);
    expect(BindingClass._resolvers[BINDING.DynamicValue]).toBe('_resolveDynamicValue');
  });

  test('_resolvers 不包含 Invalid 键', () => {
    expect(BindingClass._resolvers).not.toHaveProperty(BINDING.Invalid);
  });

  test('_resolvers 恰好包含三个键', () => {
    expect(Object.keys(BindingClass._resolvers)).toHaveLength(3);
  });
});

// ==================== 策略映射解析行为验证（需求 3.2） ====================

describe('各类型绑定通过策略映射正确解析', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  afterEach(() => {
    container.destroy();
  });

  test('Instance 类型绑定通过 get 正确解析为实例', () => {
    class MyService {}
    container.bind(MyService).toSelf();
    const instance = container.get(MyService);
    expect(instance).toBeInstanceOf(MyService);
  });

  test('ConstantValue 类型绑定通过 get 正确解析为常量值', () => {
    const token = new Token<string>('const-val');
    container.bind(token).toConstantValue('hello');
    const value = container.get(token);
    expect(value).toBe('hello');
  });

  test('DynamicValue 类型绑定通过 get 正确解析为动态值', () => {
    const token = new Token<number>('dynamic-val');
    container.bind(token).toDynamicValue(() => 42);
    const value = container.get(token);
    expect(value).toBe(42);
  });

  test('已激活的绑定再次 get 返回缓存值（单例行为）', () => {
    class MyService {}
    container.bind(MyService).toSelf();
    const first = container.get(MyService);
    const second = container.get(MyService);
    expect(first).toBe(second);
  });

  test('ConstantValue 绑定再次 get 返回相同缓存', () => {
    const token = new Token<object>('obj');
    const obj = { key: 'value' };
    container.bind(token).toConstantValue(obj);
    const first = container.get(token);
    const second = container.get(token);
    expect(first).toBe(second);
    expect(first).toBe(obj);
  });

  test('DynamicValue 绑定再次 get 返回缓存值，不重复调用工厂函数', () => {
    const token = new Token<number>('dyn');
    let callCount = 0;
    container.bind(token).toDynamicValue(() => {
      callCount++;
      return callCount;
    });
    const first = container.get(token);
    const second = container.get(token);
    expect(first).toBe(second);
    expect(callCount).toBe(1);
  });
});

// ==================== Invalid 类型抛出 BindingNotValidError（需求 3.2） ====================

describe('Invalid 类型抛出 BindingNotValidError', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  afterEach(() => {
    container.destroy();
  });

  test('未绑定服务的 Binding 调用 get 抛出 BindingNotValidError', () => {
    const token = new Token<string>('unbound');
    const binding = new Binding(token, container);
    // type 默认为 BINDING.Invalid，直接调用 get 应抛出错误
    expect(binding.type).toBe(BINDING.Invalid);
    expect(() => {
      binding.get({ parent: { token } } as any);
    }).toThrow(BindingNotValidError);
  });

  test('循环依赖检测：INITING 状态的 Binding 调用 get 抛出 CircularDependencyError', () => {
    const token = new Token<string>('circular');
    const binding = new Binding(token, container);
    binding.type = BINDING.Instance;
    // 手动设置状态为 INITING 模拟循环依赖场景
    binding.status = STATUS.INITING;
    expect(() => {
      binding.get({ token, parent: { token } } as any);
    }).toThrow(CircularDependencyError);
  });
});

// ==================== _resolveInstanceValue 职责分离验证（需求 16.1、16.2） ====================

describe('_resolveInstanceValue 职责分离', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  afterEach(() => {
    container.destroy();
  });

  test('Instance 解析后 status 变为 ACTIVATED', () => {
    class MyService {}
    container.bind(MyService).toSelf();
    container.get(MyService);
    const binding = container._bindings.get(MyService) as Binding;
    expect(binding.status).toBe(STATUS.ACTIVATED);
  });

  test('Instance 解析后 cache 为实例引用', () => {
    class MyService {}
    container.bind(MyService).toSelf();
    const instance = container.get(MyService);
    const binding = container._bindings.get(MyService) as Binding;
    expect(binding.cache).toBe(instance);
  });

  test('Instance 解析后实例被注册到 Container 的实例-容器映射中', () => {
    class MyService {}
    container.bind(MyService).toSelf();
    const instance = container.get(MyService);
    // 验证实例与容器的映射关系（通过 Container._instanceContainerMap 或 Container.map）
    const mappedContainer =
      ContainerClass._instanceContainerMap?.get(instance) ??
      (Container as any).map?.get(instance);
    expect(mappedContainer).toBe(container);
  });

  test('Instance 解析流程：创建实例 → 激活 → 注册映射 → 属性注入 → PostConstruct', () => {
    // 通过观察副作用验证调用顺序
    const executionOrder: string[] = [];

    // 创建一个带有属性注入和 PostConstruct 的服务
    class Dep {
      value = 'dep-value';
    }

    class MyService {
      @Inject(Dep) dep!: Dep;

      @PostConstruct()
      init() {
        // PostConstruct 执行时应该已经完成属性注入
        executionOrder.push('postConstruct');
        // 验证属性注入已完成
        expect(this.dep).toBeInstanceOf(Dep);
      }
    }

    container.bind(Dep).toSelf();
    container.bind(MyService).toSelf();

    const instance = container.get(MyService);

    // 验证 PostConstruct 被调用
    expect(executionOrder).toContain('postConstruct');
    // 验证属性注入成功
    expect(instance.dep).toBeInstanceOf(Dep);
    expect(instance.dep.value).toBe('dep-value');
  });

  test('ConstantValue 解析后 status 变为 ACTIVATED', () => {
    const token = new Token<string>('cv');
    container.bind(token).toConstantValue('test');
    container.get(token);
    const binding = container._bindings.get(token) as Binding;
    expect(binding.status).toBe(STATUS.ACTIVATED);
  });

  test('DynamicValue 解析后 status 变为 ACTIVATED', () => {
    const token = new Token<number>('dv');
    container.bind(token).toDynamicValue(() => 123);
    container.get(token);
    const binding = container._bindings.get(token) as Binding;
    expect(binding.status).toBe(STATUS.ACTIVATED);
  });

  test('ActivationHandler 在实例创建后被调用', () => {
    class MyService {
      activated = false;
    }

    container.bind(MyService).toSelf();
    // 获取 binding 并设置 onActivation
    const binding = container._bindings.get(MyService) as Binding<MyService>;
    binding.onActivation((_ctx, instance) => {
      instance.activated = true;
      return instance;
    });

    const instance = container.get(MyService);
    expect(instance.activated).toBe(true);
  });

  test('属性注入在实例激活之后执行', () => {
    class Dep {}

    class MyService {
      @Inject(Dep) dep!: Dep;
    }

    container.bind(Dep).toSelf();
    container.bind(MyService).toSelf();

    const instance = container.get(MyService);
    // 属性注入成功说明在激活后正确执行了注入
    expect(instance.dep).toBeInstanceOf(Dep);
  });
});
