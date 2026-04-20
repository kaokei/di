import { Container, PostConstruct, Inject, Injectable } from '@/index';
import { delay } from '@tests/utils';

/**
 * PostConstruct 异步失败行为测试
 *
 * 验证前置服务的 @PostConstruct 返回 rejected promise 时，
 * 当前服务的 PostConstruct 不执行，rejected promise 自然传播（原始错误）。
 *
 * Validates: Requirements 4.1, 4.2, 4.3
 */

describe('PostConstruct 异步失败 - 场景 1：前置服务 PostConstruct 异步失败', () => {
  @Injectable()
  class B {
    public name = 'B';
    public id = 2;

    @PostConstruct()
    public async init() {
      await new Promise(resolve => setTimeout(resolve, 100));
      // 模拟异步初始化失败：返回 rejected promise
      return Promise.reject(new Error('B 初始化失败'));
    }
  }

  @Injectable()
  class A {
    public name = 'A';
    public id = 1;

    @Inject(B)
    public b!: B;

    // @PostConstruct(true) 表示等待所有 Instance 类型的前置服务初始化完成
    @PostConstruct(true)
    public init() {
      this.id = this.id + this.b.id + 100;
    }
  }

  let container: Container;
  let initASpy: ReturnType<typeof vi.spyOn>;
  let initBSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    initASpy = vi.spyOn(A.prototype, 'init');
    initBSpy = vi.spyOn(B.prototype, 'init');

    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();
  });

  test('前置服务 B 失败后，A 的 PostConstruct 不执行，postConstructResult 是 rejected promise', async () => {
    const a = container.get(A);

    // A 实例化成功
    expect(a).toBeInstanceOf(A);
    expect(a.name).toBe('A');
    // A 的 init 尚未被调用（因为需要等待 B 初始化）
    expect(a.id).toBe(1);

    // B 的 init 已被调用（同步触发，异步执行）
    expect(initBSpy).toHaveBeenCalledOnce();
    // A 的 init 不应被调用
    expect(initASpy).not.toHaveBeenCalled();

    // 获取 Binding 对象，提前注册 rejection handler，避免 unhandled rejection
    const bindingA = container._bindings.get(A);
    const bindingB = container._bindings.get(B);
    expect(bindingA).toBeDefined();
    expect(bindingA!.postConstructResult).toBeInstanceOf(Promise);

    const rejectionB = expect(bindingB!.postConstructResult).rejects.toThrow('B 初始化失败');
    const rejectionA = expect(bindingA!.postConstructResult).rejects.toThrow('B 初始化失败');

    // 等待足够时间让 B 的异步初始化完成（并失败）
    await delay(300);

    // A 的 init 仍然不应被调用（静默失败）
    expect(initASpy).not.toHaveBeenCalled();
    // A 的 id 保持初始值，未被 PostConstruct 修改
    expect(a.id).toBe(1);

    // B 的 postConstructResult 本身也是 rejected promise
    await rejectionB;
    // A 的 postConstructResult：错误为原始错误自然传播
    await rejectionA;
  });
});

describe('PostConstruct 异步失败 - 场景 2：前置服务 PostConstruct 成功（保持测试）', () => {
  @Injectable()
  class B {
    public name = 'B';
    public id = 2;

    @PostConstruct()
    public async init() {
      await new Promise(resolve => setTimeout(resolve, 100));
      this.id = this.id + 200;
    }
  }

  @Injectable()
  class A {
    public name = 'A';
    public id = 1;
    public inited = false;

    @Inject(B)
    public b!: B;

    // @PostConstruct(true) 表示等待所有 Instance 类型的前置服务初始化完成
    @PostConstruct(true)
    public init() {
      this.id = this.id + this.b.id + 100;
      this.inited = true;
    }
  }

  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bind(A).toSelf();
    container.bind(B).toSelf();
  });

  test('前置服务 B 成功后，A 的 PostConstruct 正常执行，postConstructResult 正常 resolve', async () => {
    const a = container.get(A);

    // A 实例化成功，但 PostConstruct 尚未执行
    expect(a).toBeInstanceOf(A);
    expect(a.name).toBe('A');
    expect(a.id).toBe(1);

    // 等待 B 异步初始化完成，A 的 PostConstruct 随后执行
    await vi.waitUntil(() => a.inited);

    // B 初始化后 id = 2 + 200 = 202
    // A 的 PostConstruct 执行后 id = 1 + 202 + 100 = 303
    expect(a.id).toBe(303);
    expect(a.b.id).toBe(202);

    // 获取 A 的 Binding 对象，验证 postConstructResult
    const bindingA = container._bindings.get(A);
    expect(bindingA).toBeDefined();

    // postConstructResult 应该是一个 Promise
    expect(bindingA!.postConstructResult).toBeInstanceOf(Promise);

    // 该 Promise 应该正常 resolve
    await expect(bindingA!.postConstructResult).resolves.toBeUndefined();

    // 确认 A 的 PostConstruct 已执行
    expect(a.inited).toBe(true);
  });
});
