import {
  Inject,
  Injectable,
  Container,
  Token,
  LazyToken,
  PostConstruct,
  PreDestroy,
} from '@/index';

// ==================== 基础 Transient 测试 ====================

describe('Transient: toSelf 每次 get 返回新实例', () => {
  class A {
    public name = 'A';
    public id = 1;
  }

  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf().inTransientScope();
  });

  test('多次 get 返回不同实例', () => {
    const a1 = container.get(A);
    const a2 = container.get(A);
    const a3 = container.get(A);

    expect(a1).toBeInstanceOf(A);
    expect(a2).toBeInstanceOf(A);
    expect(a3).toBeInstanceOf(A);

    expect(a1).not.toBe(a2);
    expect(a2).not.toBe(a3);
    expect(a1).not.toBe(a3);
  });

  test('每个实例都有独立的属性', () => {
    const a1 = container.get(A);
    const a2 = container.get(A);

    a1.name = 'modified';
    a1.id = 999;

    expect(a2.name).toBe('A');
    expect(a2.id).toBe(1);
  });
});

describe('Transient: to(Class) 每次 get 返回新实例', () => {
  class AImpl {
    public value = 42;
  }

  const TOKEN = new Token<AImpl>('AImpl');

  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(TOKEN).to(AImpl).inTransientScope();
  });

  test('通过 Token 多次 get 返回不同实例', () => {
    const a1 = container.get(TOKEN);
    const a2 = container.get(TOKEN);

    expect(a1).toBeInstanceOf(AImpl);
    expect(a2).toBeInstanceOf(AImpl);
    expect(a1).not.toBe(a2);
  });
});

// ==================== 单例 vs 瞬态 对比 ====================

describe('Transient vs Singleton 对比', () => {
  class A {
    public name = 'A';
  }

  class B {
    public name = 'B';
  }

  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf(); // 默认单例
    container.bind(B).toSelf().inTransientScope(); // 瞬态
  });

  test('单例返回相同实例，瞬态返回不同实例', () => {
    const a1 = container.get(A);
    const a2 = container.get(A);
    expect(a1).toBe(a2);

    const b1 = container.get(B);
    const b2 = container.get(B);
    expect(b1).not.toBe(b2);
  });
});

// ==================== Transient 与属性注入 ====================

describe('Transient: 属性注入正常工作', () => {
  class B {
    public name = 'B';
    public id = 2;
  }

  @Injectable
  class A {
    public name = 'A';
    @Inject(B) b!: B;
  }

  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf().inTransientScope();
    container.bind(B).toSelf(); // B 是单例
  });

  test('每次 get(A) 返回新实例，但注入的 B 是同一个单例', () => {
    const a1 = container.get(A);
    const a2 = container.get(A);

    expect(a1).not.toBe(a2);
    expect(a1.b).toBe(a2.b); // B 是单例，所以是同一个
    expect(a1.b).toBeInstanceOf(B);
  });

  test('瞬态 A 的属性注入值正确', () => {
    const a = container.get(A);
    expect(a.name).toBe('A');
    expect(a.b.name).toBe('B');
    expect(a.b.id).toBe(2);
  });
});

describe('Transient: 依赖也是 Transient', () => {
  class B {
    public name = 'B';
  }

  @Injectable
  class A {
    public name = 'A';
    @Inject(B) b!: B;
  }

  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf().inTransientScope();
    container.bind(B).toSelf().inTransientScope();
  });

  test('A 和 B 都是瞬态，每次 get 都创建全新的依赖树', () => {
    const a1 = container.get(A);
    const a2 = container.get(A);

    expect(a1).not.toBe(a2);
    expect(a1.b).not.toBe(a2.b);
  });
});

// ==================== Transient 与 toDynamicValue ====================

describe('Transient: toDynamicValue 每次 get 重新执行工厂函数', () => {
  let callCount = 0;
  const TOKEN = new Token<number>('counter');

  let container: Container;

  beforeEach(() => {
    callCount = 0;
    container = new Container();
    container
      .bind(TOKEN)
      .toDynamicValue(() => {
        callCount++;
        return callCount;
      })
      .inTransientScope();
  });

  test('每次 get 调用工厂函数', () => {
    const v1 = container.get(TOKEN);
    const v2 = container.get(TOKEN);
    const v3 = container.get(TOKEN);

    expect(v1).toBe(1);
    expect(v2).toBe(2);
    expect(v3).toBe(3);
    expect(callCount).toBe(3);
  });
});

describe('Transient: toDynamicValue 单例模式只执行一次工厂函数', () => {
  let callCount = 0;
  const TOKEN = new Token<number>('counter');

  let container: Container;

  beforeEach(() => {
    callCount = 0;
    container = new Container();
    container.bind(TOKEN).toDynamicValue(() => {
      callCount++;
      return callCount;
    });
  });

  test('单例模式只调用一次工厂函数', () => {
    const v1 = container.get(TOKEN);
    const v2 = container.get(TOKEN);
    const v3 = container.get(TOKEN);

    expect(v1).toBe(1);
    expect(v2).toBe(1);
    expect(v3).toBe(1);
    expect(callCount).toBe(1);
  });
});

// ==================== Transient 与 toConstantValue ====================

describe('Transient: toConstantValue 不受 inTransientScope 影响', () => {
  const TOKEN = new Token<string>('constant');

  let container: Container;

  beforeEach(() => {
    container = new Container();
    // toConstantValue 本质上就是常量，即使设置了 transient 也应该返回同一个值
    container.bind(TOKEN).toConstantValue('hello').inTransientScope();
  });

  test('toConstantValue 即使设置 transient 也返回相同值', () => {
    const v1 = container.get(TOKEN);
    const v2 = container.get(TOKEN);

    // 虽然 transient 会重新执行 resolve，但 constantValue 每次都是同一个值
    expect(v1).toBe('hello');
    expect(v2).toBe('hello');
  });
});

// ==================== Transient 与 ActivationHandler ====================

describe('Transient: onActivation 每次 get 都触发', () => {
  class A {
    public name = 'A';
    public id = 1;
  }

  let container: Container;
  let activationCount: number;

  beforeEach(() => {
    activationCount = 0;
    container = new Container();
    container
      .bind(A)
      .toSelf()
      .inTransientScope()
      .onActivation((_ctx, inst) => {
        activationCount++;
        return inst;
      });
  });

  test('瞬态模式下 onActivation 每次 get 都被调用', () => {
    container.get(A);
    expect(activationCount).toBe(1);

    container.get(A);
    expect(activationCount).toBe(2);

    container.get(A);
    expect(activationCount).toBe(3);
  });
});

describe('Transient: Container onActivation 每次 get 都触发', () => {
  class A {
    public name = 'A';
  }

  let container: Container;
  let containerActivationCount: number;

  beforeEach(() => {
    containerActivationCount = 0;
    container = new Container();
    container.bind(A).toSelf().inTransientScope();
    container.onActivation((_ctx, inst) => {
      containerActivationCount++;
      return inst;
    });
  });

  test('容器级 onActivation 每次 get 都被调用', () => {
    container.get(A);
    expect(containerActivationCount).toBe(1);

    container.get(A);
    expect(containerActivationCount).toBe(2);
  });
});

// ==================== Transient 与 PostConstruct ====================

describe('Transient: @PostConstruct 每次 get 都执行', () => {
  let initCount = 0;

  @Injectable
  class A {
    public name = 'A';

    @PostConstruct()
    init() {
      initCount++;
    }
  }

  let container: Container;

  beforeEach(() => {
    initCount = 0;
    container = new Container();
    container.bind(A).toSelf().inTransientScope();
  });

  test('瞬态模式下 @PostConstruct 每次 get 都被调用', () => {
    container.get(A);
    expect(initCount).toBe(1);

    container.get(A);
    expect(initCount).toBe(2);

    container.get(A);
    expect(initCount).toBe(3);
  });
});

// ==================== Transient 与层级容器 ====================

describe('Transient: 层级容器中的瞬态服务', () => {
  class A {
    public name = 'A';
  }

  let parent: Container;
  let child: Container;

  beforeEach(() => {
    parent = new Container();
    child = parent.createChild();
    parent.bind(A).toSelf().inTransientScope();
  });

  test('子容器通过父容器解析瞬态服务，每次返回新实例', () => {
    const a1 = child.get(A);
    const a2 = child.get(A);

    expect(a1).toBeInstanceOf(A);
    expect(a2).toBeInstanceOf(A);
    expect(a1).not.toBe(a2);
  });

  test('父容器和子容器各自 get 返回不同实例', () => {
    const fromParent = parent.get(A);
    const fromChild = child.get(A);

    expect(fromParent).not.toBe(fromChild);
  });
});

// ==================== Transient 与 unbind ====================

describe('Transient: unbind 和 destroy 正常工作', () => {
  let destroyCount = 0;

  @Injectable
  class A {
    public name = 'A';

    @PreDestroy()
    cleanup() {
      destroyCount++;
    }
  }

  let container: Container;

  beforeEach(() => {
    destroyCount = 0;
    container = new Container();
    container.bind(A).toSelf().inTransientScope();
  });

  test('unbind 后 get 抛出异常', () => {
    container.get(A);
    container.unbind(A);

    expect(() => container.get(A)).toThrow();
  });

  test('destroy 后 get 抛出异常', () => {
    container.get(A);
    container.destroy();

    expect(() => container.get(A)).toThrow();
  });
});

// ==================== Transient 链式调用 ====================

describe('Transient: inTransientScope 链式调用', () => {
  class A {
    public name = 'A';
  }

  test('inTransientScope 返回 Binding 自身，支持链式调用', () => {
    const container = new Container();
    const binding = container.bind(A).toSelf().inTransientScope();

    expect(binding.transient).toBe(true);
  });

  test('inTransientScope 后可以继续调用 onActivation', () => {
    const container = new Container();
    let activated = false;

    container
      .bind(A)
      .toSelf()
      .inTransientScope()
      .onActivation((_ctx, inst) => {
        activated = true;
        return inst;
      });

    container.get(A);
    expect(activated).toBe(true);
  });
});

// ==================== Transient 默认值 ====================

describe('Transient: 默认是单例模式', () => {
  class A {
    public name = 'A';
  }

  test('不调用 inTransientScope 时，transient 默认为 false', () => {
    const container = new Container();
    const binding = container.bind(A).toSelf();

    expect(binding.transient).toBe(false);
  });
});

// ==================== Transient 与 LazyToken ====================

describe('Transient: 与 LazyToken 配合使用', () => {
  @Injectable
  class B {
    public name = 'B';
  }

  @Injectable
  class A {
    public name = 'A';
    @Inject(new LazyToken(() => B)) b!: B;
  }

  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf().inTransientScope();
    container.bind(B).toSelf().inTransientScope();
  });

  test('LazyToken 解析的依赖也遵循瞬态规则', () => {
    const a1 = container.get(A);
    const a2 = container.get(A);

    expect(a1).not.toBe(a2);
    expect(a1.b).not.toBe(a2.b);
    expect(a1.b).toBeInstanceOf(B);
    expect(a2.b).toBeInstanceOf(B);
  });
});
