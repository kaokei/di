import { Container, Token, Injectable, PreDestroy } from '@/index';
import { BindingNotFoundError } from '@/errors/BindingNotFoundError';

describe('Container.tryGet', () => {
  test('token 有绑定时返回实例', () => {
    const container = new Container();
    const token = new Token<string>('test');
    container.bind(token).toConstantValue('hello');

    expect(container.tryGet(token)).toBe('hello');
    container.destroy();
  });

  test('token 无绑定时返回 undefined', () => {
    const container = new Container();
    const token = new Token<string>('missing');

    expect(container.tryGet(token)).toBeUndefined();
    container.destroy();
  });

  test('tryGet 不抛出 BindingNotFoundError', () => {
    const container = new Container();
    const token = new Token<string>('missing');

    expect(() => container.tryGet(token)).not.toThrow();
    container.destroy();
  });

  test('tryGet 可以获取类实例', () => {
    class MyService {
      value = 42;
    }
    const container = new Container();
    container.bind(MyService).toSelf();

    const result = container.tryGet(MyService);
    expect(result).toBeInstanceOf(MyService);
    container.destroy();
  });
});

describe('Container.rebind', () => {
  test('rebind 后新绑定生效', () => {
    const container = new Container();
    const token = new Token<string>('test');
    container.bind(token).toConstantValue('original');

    container.rebind(token).toConstantValue('updated');

    expect(container.get(token)).toBe('updated');
    container.destroy();
  });

  test('rebind 对未绑定的 token 等同于 bind', () => {
    const container = new Container();
    const token = new Token<string>('new');

    container.rebind(token).toConstantValue('value');

    expect(container.get(token)).toBe('value');
    container.destroy();
  });

  test('rebind 会触发旧绑定的 preDestroy', () => {
    let destroyed = false;

    @Injectable()
    class MyService {
      @PreDestroy()
      preDestroy() {
        destroyed = true;
      }
    }

    const container = new Container();
    container.bind(MyService).toSelf();
    container.get(MyService);

    container.rebind(MyService).toSelf();

    expect(destroyed).toBe(true);
    container.destroy();
  });
});

describe('Container._resolveSkipSelf 不修改传入 options', () => {
  test('skipSelf 调用后原始 options.skipSelf 仍为 true', () => {
    const parent = new Container();
    const token = new Token<string>('test');
    parent.bind(token).toConstantValue('parent-val');
    const child = parent.createChild();
    child.bind(token).toConstantValue('child-val');

    const opts = { skipSelf: true };
    child.get(token, opts);

    expect(opts.skipSelf).toBe(true);
    parent.destroy();
  });
});

describe('Container.getAsync 封装 binding 副作用', () => {
  test('getAsync 正确等待 async PostConstruct', async () => {
    @Injectable()
    class AsyncService {
      initialized = false;

      async postInit() {
        this.initialized = true;
      }
    }

    const container = new Container();
    container.bind(AsyncService).toSelf();

    const instance = await container.getAsync(AsyncService);
    expect(instance).toBeInstanceOf(AsyncService);
    container.destroy();
  });

  test('getAsync 对同步绑定直接 resolve', async () => {
    const container = new Container();
    const token = new Token<string>('sync');
    container.bind(token).toConstantValue('sync-value');

    const result = await container.getAsync(token);
    expect(result).toBe('sync-value');
    container.destroy();
  });

  test('getAsync 在容器销毁后 reject', async () => {
    const container = new Container();
    const token = new Token<string>('test');
    container.bind(token).toConstantValue('val');
    container.destroy();

    await expect(container.getAsync(token)).rejects.toThrow();
  });
});
