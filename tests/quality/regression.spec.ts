/**
 * 公共 API 回归测试
 *
 * 覆盖范围：
 * - Container 的 bind/get/unbind/destroy 基本流程
 * - Binding 的 to/toSelf/toConstantValue/toDynamicValue/toService 链式调用
 * - 属性注入（@Inject）和生命周期（@PostConstruct/@PreDestroy）的基本行为
 * - 父子容器的 isBound/createChild/get 查找链
 *
 * 需求：21.3
 */

import {
  Container,
  Token,
  LazyToken,
  Inject,
  Self,
  SkipSelf,
  Optional,
  PostConstruct,
  PreDestroy,
  Injectable,
  decorate,
  LazyInject,
  createLazyInject,
} from '@/index';
import type { Context } from '@/index';

// ==================== 测试用的服务类 ====================

class SimpleService {
  name = 'SimpleService';
}

class AnotherService {
  value = 42;
}

const TOKEN_A = new Token<string>('TOKEN_A');
const TOKEN_B = new Token<number>('TOKEN_B');
const TOKEN_SIMPLE = new Token<SimpleService>('TOKEN_SIMPLE');

// ==================== Container 基本流程 ====================

describe('回归测试：Container 基本流程', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  afterEach(() => {
    container.destroy();
  });

  // --- bind ---

  test('bind(token).toSelf() 绑定类到自身', () => {
    container.bind(SimpleService).toSelf();
    const instance = container.get(SimpleService);
    expect(instance).toBeInstanceOf(SimpleService);
    expect(instance.name).toBe('SimpleService');
  });

  test('bind(token).to(Class) 绑定 token 到指定类', () => {
    container.bind(TOKEN_SIMPLE).to(SimpleService);
    const instance = container.get(TOKEN_SIMPLE);
    expect(instance).toBeInstanceOf(SimpleService);
  });

  test('bind(token).toConstantValue() 绑定常量值', () => {
    container.bind(TOKEN_A).toConstantValue('hello');
    expect(container.get(TOKEN_A)).toBe('hello');
  });

  test('bind(token).toDynamicValue() 绑定动态值', () => {
    let callCount = 0;
    container.bind(TOKEN_B).toDynamicValue(() => {
      callCount++;
      return 100;
    });
    const value = container.get(TOKEN_B);
    expect(value).toBe(100);
    expect(callCount).toBe(1);
  });

  test('toDynamicValue 的回调接收 context 参数', () => {
    container.bind(TOKEN_B).toDynamicValue((ctx: Context) => {
      expect(ctx.container).toBe(container);
      return 200;
    });
    expect(container.get(TOKEN_B)).toBe(200);
  });

  test('bind(token).toService(otherToken) 绑定到另一个服务', () => {
    container.bind(SimpleService).toSelf();
    container.bind(TOKEN_SIMPLE).toService(SimpleService);
    const fromToken = container.get(TOKEN_SIMPLE);
    const fromClass = container.get(SimpleService);
    // toService 通过 toDynamicValue 实现，每次解析都会调用 container.get
    // 由于 SimpleService 是 Instance 类型，第二次 get 返回缓存
    expect(fromToken).toBe(fromClass);
  });

  // --- get 缓存行为 ---

  test('Instance 类型绑定多次 get 返回同一实例（单例）', () => {
    container.bind(SimpleService).toSelf();
    const a = container.get(SimpleService);
    const b = container.get(SimpleService);
    expect(a).toBe(b);
  });

  test('ConstantValue 类型绑定多次 get 返回同一值', () => {
    const obj = { x: 1 };
    container.bind(TOKEN_A).toConstantValue(obj as any);
    expect(container.get(TOKEN_A)).toBe(obj);
    expect(container.get(TOKEN_A)).toBe(obj);
  });

  test('DynamicValue 类型绑定只调用一次工厂函数', () => {
    let count = 0;
    container.bind(TOKEN_B).toDynamicValue(() => ++count);
    expect(container.get(TOKEN_B)).toBe(1);
    // 第二次 get 返回缓存值
    expect(container.get(TOKEN_B)).toBe(1);
    expect(count).toBe(1);
  });

  // --- unbind ---

  test('unbind 移除绑定后 isCurrentBound 返回 false', () => {
    container.bind(TOKEN_A).toConstantValue('test');
    expect(container.isCurrentBound(TOKEN_A)).toBe(true);
    container.unbind(TOKEN_A);
    expect(container.isCurrentBound(TOKEN_A)).toBe(false);
  });

  test('unbind 不存在的 token 不抛错', () => {
    expect(() => container.unbind(TOKEN_A)).not.toThrow();
  });

  test('unbindAll 移除所有绑定', () => {
    container.bind(TOKEN_A).toConstantValue('a');
    container.bind(TOKEN_B).toConstantValue(1);
    container.unbindAll();
    expect(container.isCurrentBound(TOKEN_A)).toBe(false);
    expect(container.isCurrentBound(TOKEN_B)).toBe(false);
  });

  // --- destroy ---

  test('destroy 清理容器状态', () => {
    container.bind(TOKEN_A).toConstantValue('a');
    container.destroy();
    expect(container.isCurrentBound(TOKEN_A)).toBe(false);
  });

  // --- 重复绑定 ---

  test('重复绑定同一 token 抛出 DuplicateBindingError', () => {
    container.bind(TOKEN_A).toConstantValue('a');
    expect(() => container.bind(TOKEN_A).toConstantValue('b')).toThrow();
  });

  // --- 未绑定 token ---

  test('get 未绑定的 token 抛出 BindingNotFoundError', () => {
    expect(() => container.get(TOKEN_A)).toThrow();
  });

  test('get 未绑定的 token 使用 optional 返回 undefined', () => {
    const result = container.get(TOKEN_A, { optional: true });
    expect(result).toBeUndefined();
  });

  // --- 未绑定服务的 Binding 抛出 BindingNotValidError ---

  test('绑定但未调用 to/toConstantValue 等方法时 get 抛出错误', () => {
    container.bind(TOKEN_A);
    expect(() => container.get(TOKEN_A)).toThrow();
  });
});

// ==================== 属性注入 ====================

describe('回归测试：属性注入（@Inject）', () => {
  test('基本属性注入', () => {
    class ServiceA {
      value = 'A';
    }

    @Injectable
    class ServiceB {
      @Inject(ServiceA) a!: ServiceA;
    }

    const container = new Container();
    container.bind(ServiceA).toSelf();
    container.bind(ServiceB).toSelf();

    const b = container.get(ServiceB);
    expect(b.a).toBeInstanceOf(ServiceA);
    expect(b.a.value).toBe('A');
    container.destroy();
  });

  test('使用 Token 进行属性注入', () => {
    const TOKEN = new Token<string>('myToken');

    @Injectable
    class MyService {
      @Inject(TOKEN) msg!: string;
    }

    const container = new Container();
    container.bind(TOKEN).toConstantValue('hello');
    container.bind(MyService).toSelf();

    const svc = container.get(MyService);
    expect(svc.msg).toBe('hello');
    container.destroy();
  });

  test('使用 LazyToken 解决前向引用', () => {
    class Dep {
      name = 'dep';
    }

    @Injectable
    class Main {
      @Inject(new LazyToken(() => Dep)) dep!: Dep;
    }

    const container = new Container();
    container.bind(Dep).toSelf();
    container.bind(Main).toSelf();

    const main = container.get(Main);
    expect(main.dep).toBeInstanceOf(Dep);
    expect(main.dep.name).toBe('dep');
    container.destroy();
  });

  test('@Optional 装饰器：服务不存在时返回 undefined', () => {
    const TOKEN = new Token<string>('optional-token');

    @Injectable
    class MyService {
      @Inject(TOKEN) @Optional() optionalDep!: string;
    }

    const container = new Container();
    container.bind(MyService).toSelf();

    const svc = container.get(MyService);
    expect(svc.optionalDep).toBeUndefined();
    container.destroy();
  });
});

// ==================== 生命周期 ====================

describe('回归测试：生命周期（@PostConstruct / @PreDestroy）', () => {
  test('@PostConstruct 在实例化后被调用', () => {
    let initialized = false;

    @Injectable
    class MyService {
      @PostConstruct()
      init() {
        initialized = true;
      }
    }

    const container = new Container();
    container.bind(MyService).toSelf();
    container.get(MyService);
    expect(initialized).toBe(true);
    container.destroy();
  });

  test('@PostConstruct 可以访问注入的属性', () => {
    const TOKEN = new Token<string>('greeting');
    let capturedValue = '';

    @Injectable
    class MyService {
      @Inject(TOKEN) greeting!: string;

      @PostConstruct()
      init() {
        capturedValue = this.greeting;
      }
    }

    const container = new Container();
    container.bind(TOKEN).toConstantValue('hello');
    container.bind(MyService).toSelf();
    container.get(MyService);
    expect(capturedValue).toBe('hello');
    container.destroy();
  });

  test('@PreDestroy 在 unbind 时被调用', () => {
    let destroyed = false;

    @Injectable
    class MyService {
      @PreDestroy()
      cleanup() {
        destroyed = true;
      }
    }

    const container = new Container();
    container.bind(MyService).toSelf();
    container.get(MyService);
    expect(destroyed).toBe(false);
    container.unbind(MyService);
    expect(destroyed).toBe(true);
    container.destroy();
  });

  test('@PostConstruct 返回 Promise 时异步执行', async () => {
    let result = 0;

    @Injectable
    class MyService {
      @PostConstruct()
      async init() {
        await new Promise(resolve => setTimeout(resolve, 10));
        result = 42;
      }
    }

    const container = new Container();
    container.bind(MyService).toSelf();
    container.get(MyService);
    // 异步 PostConstruct 不会阻塞 get
    expect(result).toBe(0);
    // 等待异步完成
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(result).toBe(42);
    container.destroy();
  });
});

// ==================== 父子容器 ====================

describe('回归测试：父子容器', () => {
  test('createChild 创建子容器', () => {
    const parent = new Container();
    const child = parent.createChild();
    expect(child).toBeInstanceOf(Container);
    expect(child).not.toBe(parent);
    parent.destroy();
  });

  test('子容器可以访问父容器的绑定', () => {
    const parent = new Container();
    parent.bind(TOKEN_A).toConstantValue('from-parent');
    const child = parent.createChild();
    expect(child.get(TOKEN_A)).toBe('from-parent');
    parent.destroy();
  });

  test('子容器的绑定覆盖父容器', () => {
    const parent = new Container();
    parent.bind(TOKEN_A).toConstantValue('parent-value');
    const child = parent.createChild();
    child.bind(TOKEN_A).toConstantValue('child-value');
    expect(child.get(TOKEN_A)).toBe('child-value');
    expect(parent.get(TOKEN_A)).toBe('parent-value');
    parent.destroy();
  });

  test('isBound 检查包含父容器', () => {
    const parent = new Container();
    parent.bind(TOKEN_A).toConstantValue('a');
    const child = parent.createChild();
    expect(child.isCurrentBound(TOKEN_A)).toBe(false);
    expect(child.isBound(TOKEN_A)).toBe(true);
    parent.destroy();
  });

  test('isCurrentBound 只检查当前容器', () => {
    const parent = new Container();
    parent.bind(TOKEN_A).toConstantValue('a');
    const child = parent.createChild();
    expect(child.isCurrentBound(TOKEN_A)).toBe(false);
    child.bind(TOKEN_B).toConstantValue(1);
    expect(child.isCurrentBound(TOKEN_B)).toBe(true);
    parent.destroy();
  });

  test('@Self 只在当前容器查找', () => {
    class Dep {
      value = 'dep';
    }

    @Injectable
    class MyService {
      @Inject(Dep) @Self() dep!: Dep;
    }

    const parent = new Container();
    parent.bind(Dep).toSelf();
    const child = parent.createChild();
    child.bind(MyService).toSelf();
    // child 没有绑定 Dep，@Self 限制只在 child 中查找，应该抛错
    expect(() => child.get(MyService)).toThrow();
    parent.destroy();
  });

  test('@SkipSelf 跳过当前容器查找', () => {
    class Dep {
      value = 'dep';
    }

    @Injectable
    class MyService {
      @Inject(Dep) @SkipSelf() dep!: Dep;
    }

    const parent = new Container();
    parent.bind(Dep).toSelf();
    const child = parent.createChild();
    child.bind(Dep).toSelf();
    child.bind(MyService).toSelf();

    const svc = child.get(MyService);
    // @SkipSelf 跳过 child，从 parent 获取 Dep
    const parentDep = parent.get(Dep);
    expect(svc.dep).toBe(parentDep);
    parent.destroy();
  });

  test('多层父子容器的查找链', () => {
    const root = new Container();
    root.bind(TOKEN_A).toConstantValue('root');
    const mid = root.createChild();
    const leaf = mid.createChild();
    expect(leaf.get(TOKEN_A)).toBe('root');
    root.destroy();
  });

  test('destroy 子容器后从父容器的 children 中移除', () => {
    const parent = new Container();
    const child = parent.createChild();
    expect(parent.children?.has(child)).toBe(true);
    child.destroy();
    expect(parent.children?.has(child)).toBe(false);
    parent.destroy();
  });
});

// ==================== Activation / Deactivation Handler ====================

describe('回归测试：Activation / Deactivation Handler', () => {
  test('onActivation 在服务解析时被调用', () => {
    const container = new Container();
    const calls: string[] = [];

    container.onActivation((ctx, input, token) => {
      calls.push('activated');
      return input;
    });

    container.bind(SimpleService).toSelf();
    container.get(SimpleService);
    expect(calls).toEqual(['activated']);
    container.destroy();
  });

  test('onDeactivation 在 unbind 时被调用', () => {
    const container = new Container();
    const calls: string[] = [];

    container.onDeactivation((input, token) => {
      calls.push('deactivated');
    });

    container.bind(SimpleService).toSelf();
    container.get(SimpleService);
    container.unbind(SimpleService);
    expect(calls).toEqual(['deactivated']);
    container.destroy();
  });

  test('Binding 级别的 onActivation', () => {
    const container = new Container();
    let intercepted = false;

    const binding = container.bind(SimpleService).toSelf();
    binding.onActivation((ctx, input) => {
      intercepted = true;
      return input;
    });

    container.get(SimpleService);
    expect(intercepted).toBe(true);
    container.destroy();
  });

  test('Binding 级别的 onDeactivation', () => {
    const container = new Container();
    let cleaned = false;

    const binding = container.bind(SimpleService).toSelf();
    binding.onDeactivation(() => {
      cleaned = true;
    });

    container.get(SimpleService);
    container.unbind(SimpleService);
    expect(cleaned).toBe(true);
    container.destroy();
  });
});

// ==================== decorate 辅助函数 ====================

describe('回归测试：decorate 辅助函数', () => {
  test('decorate 可以手动应用属性装饰器', () => {
    class Dep {
      value = 'injected';
    }

    class MyService {
      dep!: Dep;
    }

    decorate(Inject(Dep), MyService, 'dep');

    const container = new Container();
    container.bind(Dep).toSelf();
    container.bind(MyService).toSelf();

    const svc = container.get(MyService);
    expect(svc.dep).toBeInstanceOf(Dep);
    expect(svc.dep.value).toBe('injected');
    container.destroy();
  });

  test('decorate 可以手动应用方法装饰器', () => {
    let called = false;

    class MyService {
      init() {
        called = true;
      }
    }

    decorate(PostConstruct(), MyService, 'init');

    const container = new Container();
    container.bind(MyService).toSelf();
    container.get(MyService);
    expect(called).toBe(true);
    container.destroy();
  });
});

// ==================== LazyInject ====================

describe('回归测试：LazyInject', () => {
  test('LazyInject 延迟解析服务', () => {
    class Dep {
      value = 'lazy';
    }

    class MyService {
      @LazyInject(Dep) dep!: Dep;
    }

    const container = new Container();
    container.bind(Dep).toSelf();
    container.bind(MyService).toSelf();

    const svc = container.get(MyService);
    // 首次访问时解析
    expect(svc.dep).toBeInstanceOf(Dep);
    expect(svc.dep.value).toBe('lazy');
    container.destroy();
  });

  test('createLazyInject 绑定到指定容器', () => {
    class Dep {
      value = 'bound';
    }

    const container = new Container();
    container.bind(Dep).toSelf();
    const inject = createLazyInject(container);

    class MyService {
      @inject(Dep) dep!: Dep;
    }

    container.bind(MyService).toSelf();
    const svc = container.get(MyService);
    expect(svc.dep).toBeInstanceOf(Dep);
    container.destroy();
  });
});

// ==================== Token ====================

describe('回归测试：Token', () => {
  test('Token 实例有 name 属性', () => {
    const token = new Token<string>('myToken');
    expect(token.name).toBe('myToken');
  });

  test('不同 Token 实例是不同的标识符', () => {
    const t1 = new Token<string>('same');
    const t2 = new Token<string>('same');
    expect(t1).not.toBe(t2);
  });

  test('LazyToken 延迟解析 token', () => {
    class MyClass {}
    const lazy = new LazyToken(() => MyClass);
    expect(lazy.resolve()).toBe(MyClass);
  });
});
