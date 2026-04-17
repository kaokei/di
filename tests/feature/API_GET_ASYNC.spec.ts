import {
  Inject,
  Injectable,
  Container,
  Token,
  LazyToken,
  PostConstruct,
  Optional,
} from '@/index';
import { BindingNotFoundError } from '@/errors/BindingNotFoundError';
import { delay } from '@tests/utils';

// ==================== 基础 getAsync 测试 ====================

describe('getAsync: 无 PostConstruct 的服务', () => {
  class A {
    public name = 'A';
    public id = 1;
  }

  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();
  });

  test('getAsync 返回 Promise，resolve 为实例', async () => {
    const a = await container.getAsync(A);
    expect(a).toBeInstanceOf(A);
    expect(a.name).toBe('A');
    expect(a.id).toBe(1);
  });

  test('getAsync 与 get 返回相同的单例实例', async () => {
    const a1 = container.get(A);
    const a2 = await container.getAsync(A);
    expect(a1).toBe(a2);
  });
});

// ==================== getAsync 与同步 PostConstruct ====================

describe('getAsync: 同步 @PostConstruct', () => {
  @Injectable()
  class A {
    public name = 'A';
    public id = 1;

    @PostConstruct()
    init() {
      this.id = 100;
    }
  }

  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();
  });

  test('getAsync 等待同步 PostConstruct 完成', async () => {
    const a = await container.getAsync(A);
    expect(a.id).toBe(100);
  });
});

// ==================== getAsync 与异步 PostConstruct ====================

describe('getAsync: 异步 @PostConstruct（无参数）', () => {
  @Injectable()
  class A {
    public name = 'A';
    public id = 1;

    @PostConstruct()
    async init() {
      await new Promise(resolve => setTimeout(resolve, 100));
      this.id = 200;
    }
  }

  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();
  });

  test('get 返回实例但 PostConstruct 可能未完成', () => {
    const a = container.get(A);
    // 同步 get 返回时，异步 PostConstruct 可能还没执行完
    expect(a).toBeInstanceOf(A);
    // id 可能还是 1（异步还没完成）
  });

  test('getAsync 等待异步 PostConstruct 完成后返回', async () => {
    const a = await container.getAsync(A);
    expect(a).toBeInstanceOf(A);
    // 注意：@PostConstruct() 无参数时，postConstructResult 是 _execute 的返回值
    // 如果 init 是 async 函数，_execute 返回 Promise，但 postConstructResult 直接赋值为该 Promise
    // getAsync 会 await 这个 Promise
    expect(a.id).toBe(200);
  });
});

describe('getAsync: 异步 @PostConstruct(true) 等待依赖', () => {
  @Injectable()
  class B {
    public name = 'B';
    public id = 2;

    @PostConstruct()
    async init() {
      await new Promise(resolve => setTimeout(resolve, 100));
      this.id = 22;
    }
  }

  @Injectable()
  class A {
    public name = 'A';
    public id = 1;

    @Inject(B) b!: B;

    @PostConstruct(true)
    init() {
      this.id = this.b.id + 100;
    }
  }

  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();
  });

  test('getAsync 等待 A 的 PostConstruct 完成（包括等待 B 的异步初始化）', async () => {
    const a = await container.getAsync(A);
    expect(a).toBeInstanceOf(A);
    // B 异步初始化后 id = 22，A 的 PostConstruct 执行后 id = 22 + 100 = 122
    expect(a.id).toBe(122);
    expect(a.b.id).toBe(22);
  });
});

// ==================== getAsync 与 toConstantValue ====================

describe('getAsync: toConstantValue', () => {
  const TOKEN = new Token<string>('greeting');

  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(TOKEN).toConstantValue('hello');
  });

  test('getAsync 对常量值正常工作', async () => {
    const value = await container.getAsync(TOKEN);
    expect(value).toBe('hello');
  });
});

// ==================== getAsync 与 toDynamicValue ====================

describe('getAsync: toDynamicValue', () => {
  const TOKEN = new Token<number>('dynamic');

  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(TOKEN).toDynamicValue(() => 42);
  });

  test('getAsync 对动态值正常工作', async () => {
    const value = await container.getAsync(TOKEN);
    expect(value).toBe(42);
  });
});

// ==================== getAsync 与 optional ====================

describe('getAsync: optional 依赖', () => {
  class A {
    public name = 'A';
  }

  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  test('getAsync 对未绑定的 optional 依赖返回 undefined', async () => {
    const result = await container.getAsync(A, { optional: true });
    expect(result).toBeUndefined();
  });

  test('getAsync 对未绑定的非 optional 依赖抛出异常', async () => {
    await expect(container.getAsync(A)).rejects.toThrow(BindingNotFoundError);
  });
});

// ==================== getAsync 与层级容器 ====================

describe('getAsync: 层级容器', () => {
  @Injectable()
  class B {
    public id = 2;

    @PostConstruct()
    async init() {
      await new Promise(resolve => setTimeout(resolve, 100));
      this.id = 22;
    }
  }

  @Injectable()
  class A {
    public id = 1;

    @Inject(B) b!: B;

    @PostConstruct(true)
    init() {
      this.id = this.b.id + 100;
    }
  }

  let parent: Container;
  let child: Container;

  beforeEach(() => {
    parent = new Container();
    child = parent.createChild();
    parent.bind(B).toSelf();
    child.bind(A).toSelf();
  });

  test('子容器 getAsync 等待父容器中依赖的异步初始化', async () => {
    const a = await child.getAsync(A);
    expect(a.id).toBe(122);
    expect(a.b.id).toBe(22);
  });
});

// ==================== getAsync 与 PostConstruct 失败 ====================

describe('getAsync: PostConstruct 异步失败', () => {
  @Injectable()
  class A {
    public name = 'A';

    @PostConstruct()
    async init() {
      await new Promise(resolve => setTimeout(resolve, 50));
      throw new Error('初始化失败');
    }
  }

  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();
  });

  test('getAsync 在 PostConstruct 失败时 reject', async () => {
    await expect(container.getAsync(A)).rejects.toThrow('初始化失败');
  });
});

describe('getAsync: 前置服务 PostConstruct 失败导致当前服务失败', () => {
  @Injectable()
  class B {
    public name = 'B';

    @PostConstruct()
    async init() {
      await new Promise(resolve => setTimeout(resolve, 50));
      throw new Error('B 初始化失败');
    }
  }

  @Injectable()
  class A {
    public name = 'A';

    @Inject(B) b!: B;

    @PostConstruct(true)
    init() {
      // 不会执行到这里
    }
  }

  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();
  });

  test('getAsync 在前置服务失败时 reject', async () => {
    await expect(container.getAsync(A)).rejects.toThrow('B 初始化失败');
  });
});

// ==================== getAsync 单例行为 ====================

describe('getAsync: 多次调用返回同一单例', () => {
  @Injectable()
  class A {
    public id = 1;

    @PostConstruct()
    async init() {
      await new Promise(resolve => setTimeout(resolve, 50));
      this.id = 100;
    }
  }

  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();
  });

  test('多次 getAsync 返回同一实例', async () => {
    const a1 = await container.getAsync(A);
    const a2 = await container.getAsync(A);
    expect(a1).toBe(a2);
    expect(a1.id).toBe(100);
  });
});

// ==================== getAsync 与 Transient ====================

describe('getAsync: 与 Transient 配合使用', () => {
  @Injectable()
  class A {
    public id = 1;

    @PostConstruct()
    async init() {
      await new Promise(resolve => setTimeout(resolve, 50));
      this.id = 100;
    }
  }

  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf().inTransientScope();
  });

  test('getAsync + Transient 每次返回新的已初始化实例', async () => {
    const a1 = await container.getAsync(A);
    const a2 = await container.getAsync(A);

    expect(a1).not.toBe(a2);
    expect(a1.id).toBe(100);
    expect(a2.id).toBe(100);
  });
});

// ==================== getAsync 与 Token ====================

describe('getAsync: 使用 Token', () => {
  @Injectable()
  class MyService {
    public ready = false;

    @PostConstruct()
    async init() {
      await new Promise(resolve => setTimeout(resolve, 50));
      this.ready = true;
    }
  }

  const SERVICE_TOKEN = new Token<MyService>('MyService');

  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(MyService).toSelf();
    container.bind(SERVICE_TOKEN).to(MyService);
  });

  test('通过 Token getAsync 等待 PostConstruct 完成', async () => {
    const service = await container.getAsync(SERVICE_TOKEN);
    expect(service).toBeInstanceOf(MyService);
    expect(service.ready).toBe(true);
  });
});

// ==================== getAsync 与 skipSelf / self ====================

describe('getAsync: skipSelf 选项', () => {
  class A {
    public name = 'A';
  }

  let parent: Container;
  let child: Container;

  beforeEach(() => {
    parent = new Container();
    child = parent.createChild();
    parent.bind(A).toSelf();
    child.bind(A).toSelf();
  });

  test('getAsync 支持 skipSelf 选项', async () => {
    const fromChild = await child.getAsync(A);
    const fromParent = await child.getAsync(A, { skipSelf: true });

    // child 自己的 A 和 parent 的 A 是不同实例
    expect(fromChild).not.toBe(fromParent);
  });
});

describe('getAsync: self 选项', () => {
  class A {
    public name = 'A';
  }

  let parent: Container;
  let child: Container;

  beforeEach(() => {
    parent = new Container();
    child = parent.createChild();
    parent.bind(A).toSelf();
  });

  test('getAsync 支持 self 选项，找不到时 optional 返回 undefined', async () => {
    const result = await child.getAsync(A, { self: true, optional: true });
    expect(result).toBeUndefined();
  });

  test('getAsync 支持 self 选项，找不到时非 optional 抛出异常', async () => {
    await expect(child.getAsync(A, { self: true })).rejects.toThrow(
      BindingNotFoundError
    );
  });
});

// ==================== getAsync 复杂依赖链 ====================

describe('getAsync: 复杂依赖链的异步初始化', () => {
  @Injectable()
  class C {
    public id = 3;

    @PostConstruct()
    async init() {
      await new Promise(resolve => setTimeout(resolve, 50));
      this.id = 33;
    }
  }

  @Injectable()
  class B {
    public id = 2;

    @Inject(C) c!: C;

    @PostConstruct(true)
    init() {
      this.id = this.c.id + 10;
    }
  }

  @Injectable()
  class A {
    public id = 1;

    @Inject(B) b!: B;

    @PostConstruct(true)
    init() {
      this.id = this.b.id + 100;
    }
  }

  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();
    container.bind(C).toSelf();
  });

  test('getAsync 等待整个依赖链的异步初始化完成', async () => {
    const a = await container.getAsync(A);
    // C: 33, B: 33 + 10 = 43, A: 43 + 100 = 143
    expect(a.id).toBe(143);
    expect(a.b.id).toBe(43);
    expect(a.b.c.id).toBe(33);
  });
});

// ==================== getAsync 返回类型 ====================

describe('getAsync: 返回类型正确', () => {
  class A {
    public name = 'A';
  }

  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();
  });

  test('getAsync 返回值是 Promise', () => {
    const result = container.getAsync(A);
    expect(result).toBeInstanceOf(Promise);
  });
});

// ==================== 并发调用相关服务类（模块顶层定义） ====================

let singletonInitCount = 0;

@Injectable()
class SingletonService {
  public id = 0;

  @PostConstruct()
  async init() {
    await new Promise(resolve => setTimeout(resolve, 50));
    singletonInitCount++;
    this.id = singletonInitCount;
  }
}

@Injectable()
class FailingService {
  @PostConstruct()
  async init() {
    await new Promise(resolve => setTimeout(resolve, 30));
    throw new Error('并发初始化失败');
  }
}

let asyncServiceInitCount = 0;

@Injectable()
class AsyncService {
  public ready = false;

  @PostConstruct()
  async init() {
    await new Promise(resolve => setTimeout(resolve, 60));
    this.ready = true;
    asyncServiceInitCount++;
  }
}

// ==================== getAsync 并发调用 ====================

describe('getAsync: 并发调用', () => {
  describe('场景 A：单例服务并发调用，PostConstruct 只执行一次', () => {
    let container: Container;

    beforeEach(() => {
      singletonInitCount = 0;
      container = new Container();
      container.bind(SingletonService).toSelf();
    });

    test('Promise.all 并发 5 次 getAsync 返回同一实例，PostConstruct 只执行一次', async () => {
      const results = await Promise.all([
        container.getAsync(SingletonService),
        container.getAsync(SingletonService),
        container.getAsync(SingletonService),
        container.getAsync(SingletonService),
        container.getAsync(SingletonService),
      ]);

      const first = results[0];
      for (const result of results) {
        expect(result).toBe(first);
      }
      expect(singletonInitCount).toBe(1);
      expect(first.id).toBe(1);
    });
  });

  describe('场景 B：PostConstruct 失败时并发调用', () => {
    let container: Container;

    beforeEach(() => {
      container = new Container();
      container.bind(FailingService).toSelf();
    });

    test('单次 getAsync 因 PostConstruct 失败而 reject', async () => {
      await expect(container.getAsync(FailingService)).rejects.toThrow(
        '并发初始化失败'
      );
    });

    test('第一次 getAsync 失败后，再次 getAsync 仍然 reject', async () => {
      // 第一次调用，触发 PostConstruct，失败
      await expect(container.getAsync(FailingService)).rejects.toThrow(
        '并发初始化失败'
      );
      // 第二次调用，实例已被缓存但 postConstructResult 是 rejected promise
      await expect(container.getAsync(FailingService)).rejects.toThrow(
        '并发初始化失败'
      );
    });
  });

  describe('场景 C：异步 PostConstruct 完成后所有并发调用都 resolve', () => {
    let container: Container;

    beforeEach(() => {
      asyncServiceInitCount = 0;
      container = new Container();
      container.bind(AsyncService).toSelf();
    });

    test('Promise.all 并发 3 次 getAsync，所有结果 ready 为 true，都是同一实例，初始化只执行一次', async () => {
      const results = await Promise.all([
        container.getAsync(AsyncService),
        container.getAsync(AsyncService),
        container.getAsync(AsyncService),
      ]);

      const first = results[0];
      for (const result of results) {
        expect(result).toBe(first);
        expect(result.ready).toBe(true);
      }
      expect(asyncServiceInitCount).toBe(1);
    });
  });
});
